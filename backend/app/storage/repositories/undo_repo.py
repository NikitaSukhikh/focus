"""
Undo Event Repository

Handles database operations for undo/redo events.
"""

from datetime import datetime
from sqlalchemy import select, and_, desc, asc, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import UndoEvent


class UndoEventRepository:
    """Repository for undo event database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_event(
        self,
        space_id: str,
        event_type: str,
        event_data: dict,
    ) -> UndoEvent:
        """Create a new undo event."""
        # Atomic insert computing next sequence in a single statement to avoid race on unique constraint.
        # SQLite lacks RETURNING in older versions; fetch back the row after insert/refresh.
        next_seq_subq = (
            select(func.coalesce(func.max(UndoEvent.sequence), 0) + 1)
            .where(UndoEvent.space_id == space_id)
        )
        next_sequence = (await self.session.execute(next_seq_subq)).scalar_one()

        event = UndoEvent(
            space_id=space_id,
            sequence=next_sequence,
            event_type=event_type,
            event_data=event_data,
            is_undone=False,
        )
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def get_last_undoable_event(self, space_id: str) -> UndoEvent | None:
        """Get the last event that can be undone (is_undone=False)."""
        stmt = (
            select(UndoEvent)
            .where(and_(UndoEvent.space_id == space_id, UndoEvent.is_undone == False))
            # Highest sequence = most recent applied event
            .order_by(desc(UndoEvent.sequence))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_last_redoable_event(self, space_id: str) -> UndoEvent | None:
        """Get the last event that can be redone (is_undone=True)."""
        stmt = (
            select(UndoEvent)
            .where(and_(UndoEvent.space_id == space_id, UndoEvent.is_undone == True))
            # Lowest undone sequence = next redo step (walk forward one)
            .order_by(asc(UndoEvent.sequence))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_as_undone(self, event_id: str) -> UndoEvent | None:
        """Mark an event as undone."""
        stmt = select(UndoEvent).where(UndoEvent.id == event_id)
        result = await self.session.execute(stmt)
        event = result.scalar_one_or_none()

        if event:
            event.is_undone = True
            await self.session.commit()
            await self.session.refresh(event)

        return event

    async def mark_as_not_undone(self, event_id: str) -> UndoEvent | None:
        """Mark an event as not undone (for redo)."""
        stmt = select(UndoEvent).where(UndoEvent.id == event_id)
        result = await self.session.execute(stmt)
        event = result.scalar_one_or_none()

        if event:
            event.is_undone = False
            await self.session.commit()
            await self.session.refresh(event)

        return event

    async def clear_redoable_events(self, space_id: str) -> int:
        """Delete all redoable events (is_undone=True) for an space."""
        stmt = (
            delete(UndoEvent)
            .where(and_(UndoEvent.space_id == space_id, UndoEvent.is_undone == True))
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount or 0

    async def get_events(
        self,
        space_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[UndoEvent]:
        """Get undo events for an space with pagination."""
        stmt = (
            select(UndoEvent)
            .where(UndoEvent.space_id == space_id)
            # Stable ordering for paginated reads
            .order_by(desc(UndoEvent.sequence))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_event_count(self, space_id: str) -> int:
        """Get total count of events for an space."""
        stmt = select(UndoEvent).where(UndoEvent.space_id == space_id)
        result = await self.session.execute(stmt)
        return len(result.scalars().all())

    async def clear_all_events(self, space_id: str) -> int:
        """Delete all undo events for an space."""
        stmt = select(UndoEvent).where(UndoEvent.space_id == space_id)
        result = await self.session.execute(stmt)
        events = result.scalars().all()

        count = len(events)
        for event in events:
            await self.session.delete(event)

        await self.session.commit()
        return count

    async def clear_all(self) -> int:
        """Delete all undo events for all spaces."""
        result = await self.session.execute(delete(UndoEvent))
        await self.session.flush()
        return result.rowcount or 0

    async def trim_to_limit(self, space_id: str, limit: int) -> int:
        """Keep only the most recent `limit` events for an space; delete older ones."""
        # Keep the newest `limit` events by sequence, delete older in one statement.
        # Find cutoff sequence at offset `limit`.
        cutoff_stmt = (
            select(UndoEvent.sequence)
            .where(UndoEvent.space_id == space_id)
            .order_by(desc(UndoEvent.sequence))
            .offset(limit)
            .limit(1)
        )
        cutoff = (await self.session.execute(cutoff_stmt)).scalar_one_or_none()
        if cutoff is None:
            return 0
        delete_stmt = delete(UndoEvent).where(
            and_(UndoEvent.space_id == space_id, UndoEvent.sequence < cutoff)
        )
        result = await self.session.execute(delete_stmt)
        await self.session.flush()
        return result.rowcount or 0
