from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    goal: str = Field(min_length=5)
    description: str = ""


class MemoryCreate(BaseModel):
    type: Literal["semantic", "decision", "episodic"]
    content: str
    reason: str = ""
    source: str = "user"
    importance: float = Field(default=0.7, ge=0, le=1)


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    owner: str = "Unassigned"
    deadline: Optional[str] = None
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    status: Literal["todo", "in_progress", "blocked", "done"] = "todo"
    milestone: str = "Backlog"
    dependencies: List[str] = []
    expected_output: str = ""
    evidence: str = ""


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    owner: Optional[str] = Field(default=None, min_length=1, max_length=100)
    deadline: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high", "critical"]] = None
    status: Optional[Literal["todo", "in_progress", "blocked", "done"]] = None
    milestone: Optional[str] = Field(default=None, min_length=1, max_length=160)
    dependencies: Optional[List[str]] = None
    expected_output: Optional[str] = None

    @model_validator(mode="after")
    def require_change(self) -> "TaskUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one task field must be provided")
        return self


class RiskItem(BaseModel):
    risk: str
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    evidence: str = ""
    suggested_action: str = ""
    status: Literal["open", "monitoring", "resolved"] = "open"
    source: str = "agent"


class RiskUpdate(BaseModel):
    status: Literal["open", "monitoring", "resolved"]


class RiskReview(BaseModel):
    run_id: str
    risks: List[RiskItem]


class ChatRequest(BaseModel):
    query: str = Field(min_length=2)
    conversation: List[str] = []


class Citation(BaseModel):
    source: str
    chunk_id: str
    excerpt: str
    score: float


class AgentAnswer(BaseModel):
    answer: str
    findings: List[str]
    knowledge_gaps: List[str]
    recommended_actions: List[str]
    groundedness: Literal["SUPPORTED", "PARTIAL", "UNSUPPORTED"]


class MeetingInput(BaseModel):
    notes: str = Field(min_length=10)


class DecisionItem(BaseModel):
    decision: str
    reason: str = ""
    evidence: str = ""
    confidence: float = Field(default=0.8, ge=0, le=1)


class ActionItem(BaseModel):
    task: str
    owner: str = "Unassigned"
    deadline: Optional[str] = None
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    status: Literal["todo", "in_progress", "blocked", "done"] = "todo"
    source: str = "meeting"
    evidence: str = ""


class MeetingAnalysis(BaseModel):
    summary: str
    decisions: List[DecisionItem]
    action_items: List[ActionItem]
    risks: List[RiskItem]
    follow_up_questions: List[str]


class MeetingSave(BaseModel):
    analysis: MeetingAnalysis
    run_id: Optional[str] = None


class PlanRequest(BaseModel):
    prompt: str = Field(min_length=5)


class PlanTask(BaseModel):
    title: str
    description: str
    owner: str = "Unassigned"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    milestone: str
    dependencies: List[str] = []
    expected_output: str


class ProjectPlan(BaseModel):
    goal: str
    milestones: List[str]
    tasks: List[PlanTask]


class FeedbackInput(BaseModel):
    value: Literal["helpful", "not_helpful"]


class ReviewInput(BaseModel):
    value: Literal["approved", "rejected"]


class WeeklyReport(BaseModel):
    headline: str
    completed: List[str]
    in_progress: List[str]
    blocked: List[str]
    key_decisions: List[str]
    risks: List[str]
    next_week_priorities: List[str]
