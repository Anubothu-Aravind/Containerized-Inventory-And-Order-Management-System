"""\
${message}
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = ${repr(upgrade_id)}
down_revision = ${repr(downgrade_id)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade():
    ${upgrades if upgrades else 'pass'}


def downgrade():
    ${downgrades if downgrades else 'pass'}
