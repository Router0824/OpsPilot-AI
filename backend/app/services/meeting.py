"""Meeting intelligence with structured LLM output and a deterministic fallback."""

import re
from datetime import datetime, timedelta, timezone
from typing import List

from ..schemas import ActionItem, DecisionItem, MeetingAnalysis, RiskItem
from .llm import LLMService


OWNER_PATTERNS = [
    re.compile(r"(?P<owner>[A-Z][a-z]+)\s+(?:will|to|owns?|should)\s+(?P<task>[^.!\n]+)"),
    re.compile(r"(?P<task>[^.!\n]+)\s+(?:—|-)\s+(?P<owner>[A-Z][a-z]+)"),
]


def _deadline(sentence: str) -> str | None:
    lowered = sentence.lower()
    now = datetime.now(timezone.utc)
    if "next friday" in lowered:
        days = (4 - now.weekday()) % 7 or 7
        return (now + timedelta(days=days)).date().isoformat()
    match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", sentence)
    return match.group(1) if match else None


def parse_meeting_demo(notes: str) -> MeetingAnalysis:
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", notes) if part.strip()]
    decisions: List[DecisionItem] = []
    actions: List[ActionItem] = []
    risks: List[RiskItem] = []
    for sentence in sentences:
        lowered = sentence.lower()
        if any(marker in lowered for marker in ("decided", "decision", "will not use", "won't use")):
            reason = sentence.split("because", 1)[1].strip(" .") if "because" in lowered else ""
            decisions.append(DecisionItem(decision=sentence, reason=reason, evidence=sentence))
        if any(marker in lowered for marker in ("risk", "blocked", "uncertain", "concern")):
            risks.append(RiskItem(risk=sentence, severity="high" if "blocked" in lowered else "medium", evidence=sentence, suggested_action="Assign an owner and resolution date.", source="meeting"))
        for pattern in OWNER_PATTERNS:
            match = pattern.search(sentence)
            if match:
                if match.group("owner").lower() in {"not", "we", "it", "deadline"}:
                    continue
                task = match.group("task").strip(" .")
                actions.append(ActionItem(task=task, owner=match.group("owner").title(), deadline=_deadline(notes), priority="high" if "urgent" in lowered else "medium", evidence=sentence))
                break
    if not decisions:
        compare = next((sentence for sentence in sentences if "compare" in sentence.lower()), None)
        if compare:
            decisions.append(DecisionItem(decision=f"Proceed with {compare.lower().rstrip('.')}", evidence=compare, confidence=0.65))
    summary = " ".join(sentences[:2])[:420] or "Meeting notes captured."
    questions = []
    if any(action.deadline is None for action in actions):
        questions.append("What deadline should be assigned to the undated action items?")
    if any(action.owner == "Unassigned" for action in actions):
        questions.append("Who owns the unassigned action items?")
    if not risks:
        risks.append(RiskItem(risk="Success criteria and evaluation thresholds were not explicitly recorded.", severity="medium", evidence="No explicit success threshold in the notes.", suggested_action="Define a measurable acceptance threshold.", source="meeting"))
    return MeetingAnalysis(summary=summary, decisions=decisions, action_items=actions, risks=risks, follow_up_questions=questions or ["What evidence will be used to close each action item?"])


def analyze_meeting(notes: str) -> tuple[MeetingAnalysis, int | None]:
    llm = LLMService()
    if llm.available:
        return llm.parse(
            "Extract meeting intelligence. Do not invent owners or deadlines; use Unassigned or null. Return the exact schema.",
            notes,
            MeetingAnalysis,
        )
    return parse_meeting_demo(notes), None
