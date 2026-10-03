"""Add explicit workflow and human-review audit fields.

Revision ID: 20261003_0002
Revises: 20261003_0001
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261003_0002"
down_revision: Union[str, Sequence[str], None] = "20261003_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("agent_runs", sa.Column("workflow", sa.String(length=100), server_default="workspace_agent", nullable=False))
    op.add_column("agent_runs", sa.Column("input_type", sa.String(length=40), server_default="text", nullable=False))
    op.add_column("agent_runs", sa.Column("human_approved", sa.Boolean(), nullable=True))
    op.execute(
        """UPDATE agent_runs SET workflow = CASE
        WHEN agent = 'Meeting Intelligence' THEN 'meeting_intelligence'
        WHEN agent LIKE 'Risk Detection%' THEN 'risk_detection'
        WHEN agent LIKE 'Weekly Report%' THEN 'weekly_report'
        WHEN agent LIKE 'Operations Agent%' THEN 'operations_copilot'
        WHEN agent LIKE 'Knowledge Agent%' THEN 'knowledge_qa'
        ELSE 'workspace_agent' END"""
    )
    op.execute(
        """UPDATE agent_runs SET input_type = CASE
        WHEN workflow = 'meeting_intelligence' THEN 'meeting_notes'
        WHEN workflow IN ('risk_detection', 'weekly_report') THEN 'workspace_state'
        WHEN workflow IN ('operations_copilot', 'knowledge_qa') THEN 'question'
        ELSE 'text' END"""
    )
    op.execute("UPDATE agent_runs SET human_approved = TRUE WHERE feedback = 'approved'")
    op.execute("UPDATE agent_runs SET human_approved = FALSE WHERE feedback = 'rejected'")
    op.execute("UPDATE agent_runs SET feedback = NULL WHERE feedback IN ('approved', 'rejected')")
    op.create_index(op.f("ix_agent_runs_workflow"), "agent_runs", ["workflow"])
    op.create_index(op.f("ix_agent_runs_status"), "agent_runs", ["status"])


def downgrade() -> None:
    op.drop_index(op.f("ix_agent_runs_status"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_workflow"), table_name="agent_runs")
    op.drop_column("agent_runs", "human_approved")
    op.drop_column("agent_runs", "input_type")
    op.drop_column("agent_runs", "workflow")
