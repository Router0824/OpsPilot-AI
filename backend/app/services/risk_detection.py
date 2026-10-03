"""Explainable, deterministic operational risk detection.

The workflow proposes risks for human review; it never writes them directly.
Rules intentionally stay inspectable so an operations owner can understand why
each alert exists and tune them before connecting external systems.
"""

import json
import re
from datetime import date
from typing import Iterable, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..schemas import RiskItem


def _words(value: str) -> set[str]:
    ignored = {"a", "an", "the", "for", "to", "we", "decided", "decision", "do", "not"}
    return {word for word in re.findall(r"[a-z0-9]+", value.lower()) if word not in ignored}


def _conflicting_decisions(decisions: Iterable[models.Memory]) -> List[RiskItem]:
    items = list(decisions)
    risks: List[RiskItem] = []
    for index, left in enumerate(items):
        left_negative = any(term in left.content.lower() for term in ("not use", "reject", "avoid", "do not"))
        for right in items[index + 1 :]:
            right_negative = any(term in right.content.lower() for term in ("not use", "reject", "avoid", "do not"))
            if left_negative == right_negative:
                continue
            left_words, right_words = _words(left.content), _words(right.content)
            similarity = len(left_words & right_words) / max(1, len(left_words | right_words))
            if similarity >= 0.45:
                risks.append(RiskItem(
                    risk="Potential conflict between active workspace decisions.",
                    severity="high",
                    evidence=f"'{left.content}' conflicts with '{right.content}'.",
                    suggested_action="Review both decisions, retire the outdated record, and document the effective choice.",
                    source="Decision conflict workflow",
                ))
    return risks


def detect_risks(db: Session, workspace_id: str) -> List[RiskItem]:
    today = date.today().isoformat()
    all_tasks = db.scalars(select(models.Task).where(models.Task.workspace_id == workspace_id)).all()
    tasks = [task for task in all_tasks if task.status != "done"]
    decisions = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id, models.Memory.type == "decision")).all()
    tasks_by_title = {task.title: task for task in all_tasks}
    candidates: List[RiskItem] = []

    for task in tasks:
        evidence_bits = []
        severity = "medium"
        if task.status == "blocked":
            evidence_bits.append("blocked")
            severity = "critical" if task.priority == "critical" else "high"
        if task.deadline and task.deadline < today:
            evidence_bits.append(f"overdue since {task.deadline}")
            severity = "critical" if task.priority in {"high", "critical"} else "high"
        if task.owner == "Unassigned":
            evidence_bits.append("has no owner")
        if task.priority in {"high", "critical"} and not task.deadline:
            evidence_bits.append("has no deadline")
        dependencies = json.loads(task.dependencies_json or "[]")
        incomplete = [title for title in dependencies if title not in tasks_by_title or tasks_by_title[title].status != "done"]
        if incomplete:
            evidence_bits.append(f"waiting on {', '.join(incomplete)}")
        if evidence_bits:
            candidates.append(RiskItem(
                risk=f"{task.title} may threaten the delivery plan.",
                severity=severity,
                evidence=f"Task '{task.title}': " + "; ".join(evidence_bits) + ".",
                suggested_action="Assign a clear owner and resolution date, then review the dependency path.",
                source="Risk Detection workflow",
            ))

    candidates.extend(_conflicting_decisions(decisions))
    unique = {item.evidence: item for item in candidates}
    return list(unique.values())
