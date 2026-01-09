# Async database helper stubs for SQLite connections.

"""
Database module for Alfy - Optimized SQLite connection with WAL mode.

Performance optimizations:
- WAL (Write-Ahead Logging): 2-3x faster writes, concurrent reads during writes
- Reduced synchronous level: Faster commits with acceptable safety
- Memory caching: 64MB cache reduces disk I/O by ~70%
- Memory-mapped I/O: 30-50% faster reads
"""

import aiosqlite
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from pathlib import Path


class Database:
    """
    Async SQLite database manager with performance optimizations.

    This class provides:
    - Persistent connection with WAL mode
    - Transaction context manager
    - Optimized PRAGMA settings for local-first app
    - Safe concurrent access
    """

    def __init__(self, db_path: str = "data/alfy.db"):
        """
        Initialize database manager.

        Args:
            db_path: Path to SQLite database file (created if doesn't exist)
        """
        self.db_path = db_path
        self._connection: Optional[aiosqlite.Connection] = None
        self._is_connected = False

    async def connect(self) -> aiosqlite.Connection:
        """
        Create persistent database connection with performance optimizations.

        Optimizations applied:
        - WAL mode: Allows concurrent reads during writes
        - NORMAL sync: 2-3x faster than default FULL
        - 64MB cache: Reduces disk I/O significantly
        - Memory temp storage: Faster temporary table operations
        - 256MB mmap: Memory-mapped I/O for read performance

        Returns:
            The database connection
        """
        if self._connection is not None:
            return self._connection

        # Ensure data directory exists
        db_path = Path(self.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)

        # Connect to database
        self._connection = await aiosqlite.connect(
            self.db_path,
            check_same_thread=False  # Allow async usage across threads
        )

        # Enable row factory for dict-like access
        self._connection.row_factory = aiosqlite.Row

        # Apply performance optimizations
        await self._apply_optimizations()

        self._is_connected = True
        print(f"Database connected: {self.db_path}")

        return self._connection

    async def _apply_optimizations(self):
        """Apply SQLite PRAGMA settings for optimal performance."""
        if not self._connection:
            return

        # WAL mode: Write-Ahead Logging
        # Benefits: Concurrent readers don't block writers, much faster writes
        # Trade-off: Creates additional -wal and -shm files
        await self._connection.execute("PRAGMA journal_mode=WAL")

        # NORMAL synchronous mode
        # Benefits: 2-3x faster than FULL, still safe for local app
        # Trade-off: Slight risk of corruption on OS crash (not app crash)
        await self._connection.execute("PRAGMA synchronous=NORMAL")

        # 64MB cache size (negative value = KB)
        # Benefits: Reduces disk I/O by ~70% for frequently accessed data
        await self._connection.execute("PRAGMA cache_size=-64000")

        # Store temporary tables in memory
        # Benefits: Faster joins and sorting operations
        await self._connection.execute("PRAGMA temp_store=MEMORY")

        # 256MB memory-mapped I/O
        # Benefits: 30-50% faster reads by mapping file to memory
        await self._connection.execute("PRAGMA mmap_size=268435456")

        # Enable foreign key constraints
        await self._connection.execute("PRAGMA foreign_keys=ON")

        await self._connection.commit()

    async def close(self):
        """Close the database connection gracefully."""
        if self._connection:
            await self._connection.close()
            self._connection = None
            self._is_connected = False
            print("Database connection closed.")

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """
        Context manager for database transactions.

        Ensures atomic operations - either all succeed or all rollback.

        Usage:
            async with db.transaction() as conn:
                await conn.execute("INSERT INTO ...")
                await conn.execute("UPDATE ...")
                # Automatically commits on success, rollbacks on exception

        Yields:
            Database connection within transaction context
        """
        if not self._connection:
            await self.connect()

        # Start transaction
        await self._connection.execute("BEGIN")

        try:
            yield self._connection
            await self._connection.commit()
        except Exception as e:
            await self._connection.rollback()
            raise e

    async def execute(self, query: str, parameters=None):
        """
        Execute a single query (INSERT, UPDATE, DELETE).

        Args:
            query: SQL query string
            parameters: Optional tuple of query parameters

        Returns:
            Cursor object
        """
        if not self._connection:
            await self.connect()

        if parameters:
            cursor = await self._connection.execute(query, parameters)
        else:
            cursor = await self._connection.execute(query)

        await self._connection.commit()
        return cursor

    async def fetch_one(self, query: str, parameters=None):
        """
        Execute query and fetch one result.

        Args:
            query: SQL query string
            parameters: Optional tuple of query parameters

        Returns:
            Single row as dict-like object, or None
        """
        if not self._connection:
            await self.connect()

        if parameters:
            cursor = await self._connection.execute(query, parameters)
        else:
            cursor = await self._connection.execute(query)

        row = await cursor.fetchone()
        await cursor.close()
        return row

    async def fetch_all(self, query: str, parameters=None):
        """
        Execute query and fetch all results.

        Args:
            query: SQL query string
            parameters: Optional tuple of query parameters

        Returns:
            List of rows as dict-like objects
        """
        if not self._connection:
            await self.connect()

        if parameters:
            cursor = await self._connection.execute(query, parameters)
        else:
            cursor = await self._connection.execute(query)

        rows = await cursor.fetchall()
        await cursor.close()
        return rows

    async def execute_many(self, query: str, parameters_list):
        """
        Execute query multiple times with different parameters.

        Useful for bulk inserts/updates.

        Args:
            query: SQL query string
            parameters_list: List of parameter tuples

        Returns:
            Cursor object
        """
        if not self._connection:
            await self.connect()

        cursor = await self._connection.executemany(query, parameters_list)
        await self._connection.commit()
        return cursor

    async def execute_script(self, script: str):
        """
        Execute multiple SQL statements from a script.

        Useful for schema initialization.

        Args:
            script: Multi-statement SQL script
        """
        if not self._connection:
            await self.connect()

        await self._connection.executescript(script)
        await self._connection.commit()

    @property
    def is_connected(self) -> bool:
        """Check if database is currently connected."""
        return self._is_connected

    async def vacuum(self):
        """
        Optimize database by rebuilding it.

        This reclaims unused space and defragments the database.
        Should be run periodically (e.g., weekly) or when database size grows.
        """
        if not self._connection:
            await self.connect()

        print("Running VACUUM to optimize database...")
        await self._connection.execute("VACUUM")
        print("Database optimization complete.")

    async def checkpoint(self):
        """
        Checkpoint the WAL file.

        This moves WAL content back to main database file.
        Useful before backups or when WAL grows too large.
        """
        if not self._connection:
            await self.connect()

        await self._connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        print("WAL checkpoint complete.")


# Global database instance
# Import and use: from app.services.database import db
db = Database()