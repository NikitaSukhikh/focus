"""Initial schema for Ocean backend."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "islands",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("color", sa.String(length=7), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("object_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "objects",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("island_id", sa.String(), sa.ForeignKey("islands.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=400), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_title", sa.String(length=400), nullable=False, server_default=""),
        sa.Column("default_description", sa.Text(), nullable=True),
        sa.Column("custom_title", sa.String(length=400), nullable=True),
        sa.Column("custom_description", sa.Text(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_objects_island_type", "objects", ["island_id", "type"])

    op.create_table(
        "google_tokens",
        sa.Column("user_id", sa.String(length=100), primary_key=True),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_uri", sa.String(length=255), nullable=True),
        sa.Column("client_id", sa.String(length=255), nullable=True),
        sa.Column("client_secret", sa.Text(), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_email", sa.String(length=255), nullable=True),
        sa.Column("requires_reauth", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "assistant_tokens",
        sa.Column("user_id", sa.String(length=100), primary_key=True),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_uri", sa.String(length=255), nullable=True),
        sa.Column("client_id", sa.String(length=255), nullable=True),
        sa.Column("client_secret", sa.Text(), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("requires_reauth", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "undo_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("island_id", sa.String(), sa.ForeignKey("islands.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("event_data", sa.JSON(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_undone", sa.Boolean(), nullable=False, server_default=sa.text("0"), index=True),
    )
    op.create_index("idx_undo_events_island_sequence", "undo_events", ["island_id", "sequence"], unique=True)
    op.create_index("idx_undo_events_island_undone", "undo_events", ["island_id", "is_undone", "sequence"])


def downgrade() -> None:
    op.drop_index("idx_undo_events_island_undone", table_name="undo_events")
    op.drop_index("idx_undo_events_island_sequence", table_name="undo_events")
    op.drop_table("undo_events")
    op.drop_table("assistant_tokens")
    op.drop_table("google_tokens")
    op.drop_index("idx_objects_island_type", table_name="objects")
    op.drop_table("objects")
    op.drop_table("islands")
