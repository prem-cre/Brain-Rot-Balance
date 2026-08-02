"""persist daily analytics"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_daily_analytics"
down_revision = "0002_session_engagement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("daily_analytics", sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False), sa.Column("date", sa.String(10), nullable=False), sa.Column("learning_minutes", sa.Integer(), nullable=False, server_default="0"), sa.Column("entertainment_minutes", sa.Integer(), nullable=False, server_default="0"), sa.Column("videos_completed", sa.Integer(), nullable=False, server_default="0"), sa.Column("learning_confidence", sa.Integer(), nullable=False, server_default="0"), sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"), sa.Column("topics", postgresql.JSONB(), nullable=False, server_default="[]"))
    op.create_index("ix_daily_analytics_user_id", "daily_analytics", ["user_id"])
    op.create_index("ix_daily_analytics_date", "daily_analytics", ["date"])
    op.create_unique_constraint("uq_daily_analytics_user_date", "daily_analytics", ["user_id", "date"])


def downgrade() -> None:
    op.drop_constraint("uq_daily_analytics_user_date", "daily_analytics", type_="unique")
    op.drop_table("daily_analytics")
