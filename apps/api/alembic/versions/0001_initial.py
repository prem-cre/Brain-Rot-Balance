"""create Brain-Rot Balance persistence tables"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True), sa.Column("device_id", sa.String(128), nullable=False, unique=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("wallets", sa.Column("user_id", postgresql.UUID(as_uuid=False), primary_key=True), sa.Column("remaining_minutes", sa.Integer(), nullable=False, server_default="50"), sa.Column("limit_minutes", sa.Integer(), nullable=False, server_default="50"), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("videos", sa.Column("id", sa.String(32), primary_key=True), sa.Column("title", sa.String(300), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("channel_name", sa.String(200), nullable=False), sa.Column("duration_seconds", sa.Integer()), sa.Column("transcript", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("video_classifications", sa.Column("video_id", sa.String(32), primary_key=True), sa.Column("category", sa.String(30), nullable=False), sa.Column("education_score", sa.Integer(), nullable=False), sa.Column("entertainment_score", sa.Integer(), nullable=False), sa.Column("confidence", sa.Integer(), nullable=False), sa.Column("topics", postgresql.JSONB(), nullable=False), sa.Column("model_version", sa.String(60), nullable=False))
    op.create_table("wallet_ledger", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False), sa.Column("session_id", postgresql.UUID(as_uuid=False)), sa.Column("delta_minutes", sa.Integer(), nullable=False), sa.Column("reason", sa.String(40), nullable=False), sa.Column("idempotency_key", sa.String(160), nullable=False, unique=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("watch_sessions", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False), sa.Column("video_id", sa.String(32), nullable=False), sa.Column("kind", sa.String(20), nullable=False), sa.Column("watched_seconds", sa.Integer(), nullable=False, server_default="0"), sa.Column("active_seconds", sa.Integer(), nullable=False, server_default="0"), sa.Column("max_position_seconds", sa.Integer(), nullable=False, server_default="0"), sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("completed_at", sa.DateTime(timezone=True)))
    op.create_table("vault_items", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False), sa.Column("video_id", sa.String(32), nullable=False), sa.Column("goal", sa.String(200), nullable=False), sa.Column("priority", sa.Integer(), nullable=False, server_default="3"), sa.Column("status", sa.String(20), nullable=False, server_default="queued"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))


def downgrade() -> None:
    for table in ("vault_items", "watch_sessions", "wallet_ledger", "video_classifications", "videos", "wallets", "users"):
        op.drop_table(table)
