from ..schemas import PlanTask, ProjectPlan
from .llm import LLMService


def generate_plan(goal: str, workspace_goal: str) -> tuple[ProjectPlan, int | None]:
    llm = LLMService()
    if llm.available:
        return llm.parse(
            "Create a concise executable project plan. Dependencies must name task titles in the same plan. Return the exact schema.",
            f"Workspace goal: {workspace_goal}\nRequest: {goal}",
            ProjectPlan,
        )
    tasks = [
        PlanTask(title="Define evaluation protocol", description="Create labelled queries, metrics, and pass thresholds.", priority="critical", milestone="Week 1 · Evidence", dependencies=[], expected_output="Versioned evaluation dataset and rubric"),
        PlanTask(title="Implement memory baseline", description="Build the simplest comparable long-term memory pipeline.", priority="high", milestone="Week 1 · Baseline", dependencies=["Define evaluation protocol"], expected_output="Reproducible baseline run"),
        PlanTask(title="Run retrieval experiments", description="Compare hybrid retrieval and memory policies with ablations.", priority="high", milestone="Week 2 · Validate", dependencies=["Implement memory baseline"], expected_output="Metrics table with failure analysis"),
        PlanTask(title="Publish recommendation", description="Review evidence, document the decision, and define follow-ups.", priority="medium", milestone="Week 2 · Decide", dependencies=["Run retrieval experiments"], expected_output="Decision memo and implementation plan"),
    ]
    return ProjectPlan(goal=goal, milestones=["Week 1 · Evidence", "Week 1 · Baseline", "Week 2 · Validate", "Week 2 · Decide"], tasks=tasks), None

