"""add session engagement fields"""
from alembic import op
import sqlalchemy as sa

revision = "0002_session_engagement"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("watch_sessions", sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("watch_sessions", sa.Column("tab_focus_ratio", sa.Float(), nullable=False, server_default="1.0"))
    op.add_column("watch_sessions", sa.Column("playback_speed", sa.Float(), nullable=False, server_default="1.0"))


def downgrade() -> None:
    op.drop_column("watch_sessions", "playback_speed")
    op.drop_column("watch_sessions", "tab_focus_ratio")
    op.drop_column("watch_sessions", "last_heartbeat_at")
