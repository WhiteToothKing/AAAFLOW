"""chat_sessions: llm_provider + llm_model

Revision ID: 0002_chat_llm
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_chat_llm"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_sessions",
        sa.Column("llm_provider", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "chat_sessions",
        sa.Column("llm_model", sa.String(length=128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_sessions", "llm_model")
    op.drop_column("chat_sessions", "llm_provider")
