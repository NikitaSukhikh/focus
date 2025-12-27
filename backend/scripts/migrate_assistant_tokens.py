"""
Migration script to create assistant_tokens table.

This script creates the assistant_tokens table if it doesn't exist.
Run this manually after updating the database schema.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.storage.db import engine, Base, AssistantToken
from app.core.logging import get_logger

logger = get_logger(__name__)


async def migrate():
    """Create assistant_tokens table if it doesn't exist."""
    try:
        logger.info("Starting database migration for assistant_tokens table...")

        async with engine.begin() as conn:
            # Create only the assistant_tokens table
            await conn.run_sync(Base.metadata.create_all, tables=[AssistantToken.__table__])

        logger.info("Migration complete! assistant_tokens table created successfully.")
        return True
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    success = asyncio.run(migrate())
    sys.exit(0 if success else 1)
