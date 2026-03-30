"""initial schema: users, art_tasks, generation_results, comfyui_workflows, chat

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    taskstatus = postgresql.ENUM(
        "pending",
        "analyzing",
        "routing",
        "generating",
        "review",
        "completed",
        "failed",
        "cancelled",
        name="taskstatus",
        create_type=True,
    )
    arttype = postgresql.ENUM(
        "character",
        "scene",
        "prop",
        "ui",
        "concept",
        "texture",
        "icon",
        "poster",
        "other",
        name="arttype",
        create_type=True,
    )
    artstyle = postgresql.ENUM(
        "realistic",
        "cartoon",
        "anime",
        "pixel",
        "low_poly",
        "hand_painted",
        "flat",
        "semi_realistic",
        "other",
        name="artstyle",
        create_type=True,
    )
    generationmode = postgresql.ENUM(
        "api",
        "comfyui",
        name="generationmode",
        create_type=True,
    )
    generationprovider = postgresql.ENUM(
        "dall_e",
        "gemini",
        "midjourney",
        "stable_diffusion",
        "comfyui_local",
        "comfyui_cloud",
        name="generationprovider",
        create_type=True,
    )
    messagerole = postgresql.ENUM(
        "user",
        "assistant",
        "system",
        name="messagerole",
        create_type=True,
    )
    messagetype = postgresql.ENUM(
        "text",
        "analysis",
        "skill_invoke",
        "generation_result",
        "error",
        name="messagetype",
        create_type=True,
    )

    taskstatus.create(op.get_bind(), checkfirst=True)
    arttype.create(op.get_bind(), checkfirst=True)
    artstyle.create(op.get_bind(), checkfirst=True)
    generationmode.create(op.get_bind(), checkfirst=True)
    generationprovider.create(op.get_bind(), checkfirst=True)
    messagerole.create(op.get_bind(), checkfirst=True)
    messagetype.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=True,
            server_default="user",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=True,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "art_tasks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="taskstatus", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "art_type",
            postgresql.ENUM(name="arttype", create_type=False),
            nullable=True,
        ),
        sa.Column(
            "art_style",
            postgresql.ENUM(name="artstyle", create_type=False),
            nullable=True,
        ),
        sa.Column(
            "generation_mode",
            postgresql.ENUM(name="generationmode", create_type=False),
            nullable=True,
        ),
        sa.Column(
            "generation_provider",
            postgresql.ENUM(name="generationprovider", create_type=False),
            nullable=True,
        ),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column(
            "num_variations",
            sa.Integer(),
            nullable=False,
            server_default="4",
        ),
        sa.Column("reference_images", sa.JSON(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("ai_analysis", sa.JSON(), nullable=True),
        sa.Column("optimized_prompt", sa.Text(), nullable=True),
        sa.Column("negative_prompt", sa.Text(), nullable=True),
        sa.Column(
            "priority",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("creator_id", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["creator_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "comfyui_workflows",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("workflow_json", sa.JSON(), nullable=False),
        sa.Column("art_types", sa.JSON(), nullable=True),
        sa.Column("art_styles", sa.JSON(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=True,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "version",
            sa.String(length=20),
            nullable=True,
            server_default="1.0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "generation_results",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("task_id", sa.UUID(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column(
            "provider",
            postgresql.ENUM(name="generationprovider", create_type=False),
            nullable=False,
        ),
        sa.Column("generation_params", sa.JSON(), nullable=True),
        sa.Column("generation_time_seconds", sa.Float(), nullable=True),
        sa.Column(
            "is_selected",
            sa.Boolean(),
            nullable=True,
            server_default=sa.text("false"),
        ),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["art_tasks.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("task_id", sa.UUID(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=True,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["art_tasks.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(name="messagerole", create_type=False),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "message_type",
            postgresql.ENUM(name="messagetype", create_type=False),
            nullable=False,
            server_default="text",
        ),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("image_urls", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["chat_sessions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("generation_results")
    op.drop_table("comfyui_workflows")
    op.drop_table("art_tasks")
    op.drop_table("users")

    postgresql.ENUM(name="messagetype").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="messagerole").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="generationprovider").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="generationmode").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="artstyle").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="arttype").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="taskstatus").drop(op.get_bind(), checkfirst=True)
