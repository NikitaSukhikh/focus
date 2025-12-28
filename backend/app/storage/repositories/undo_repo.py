"""
Undo Event Repository

Handles database operations for undo/redo events.
"""

from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import UndoEvent


class UndoEventRepository:
    """Repository for undo event database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_event(
        self,
        island_id: str,
        event_type: str,
        event_data: dict,
    ) -> UndoEvent:
        """Create a new undo event."""
        event = UndoEvent(
            island_id=island_id,
            event_type=event_type,
            event_data=event_data,
            is_undone=False,
        )
        self.session.add(event)
        await self.session.commit()
        await self.session.refresh(event)
        return event

    async def get_last_undoable_event(self, island_id: str) -> Optional[UndoEvent]:
        """Get the last event that can be undone (is_undone=False)."""
        stmt = (
            select(UndoEvent)
            .where(and_(UndoEvent.island_id == island_id, UndoEvent.is_undone == False))
            .order_by(desc(UndoEvent.timestamp), desc(UndoEvent.id))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_last_redoable_event(self, island_id: str) -> Optional[UndoEvent]:
        """Get the last event that can be redone (is_undone=True)."""
        stmt = (
            select(UndoEvent)
            .where(and_(UndoEvent.island_id == island_id, UndoEvent.is_undone == True))
            .order_by(desc(UndoEvent.timestamp), desc(UndoEvent.id))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_as_undone(self, event_id: str) -> Optional[UndoEvent]:
        """Mark an event as undone."""
        stmt = select(UndoEvent).where(UndoEvent.id == event_id)
        result = await self.session.execute(stmt)
        event = result.scalar_one_or_none()

        if event:
            event.is_undone = True
            await self.session.commit()
            await self.session.refresh(event)

        return event

    async def mark_as_not_undone(self, event_id: str) -> Optional[UndoEvent]:
        """Mark an event as not undone (for redo)."""
        stmt = select(UndoEvent).where(UndoEvent.id == event_id)
        result = await self.session.execute(stmt)
        event = result.scalar_one_or_none()

        if event:
            event.is_undone = False
            await self.session.commit()
            await self.session.refresh(event)

        return event

    async def clear_redoable_events(self, island_id: str) -> int:
        """Delete all redoable events (is_undone=True) for an island."""
        stmt = select(UndoEvent).where(
            and_(UndoEvent.island_id == island_id, UndoEvent.is_undone == True)
        )
        result = await self.session.execute(stmt)
        events = result.scalars().all()

        count = len(events)
        for event in events:
            await self.session.delete(event)

        await self.session.commit()
        return count

    async def trim_old_events(self, island_id: str, max_events: int = 100) -> int:
        """Keep only the most recent max_events for an island."""
        # Get all events ordered by timestamp desc
        stmt = (
            select(UndoEvent)
            .where(UndoEvent.island_id == island_id)
            .order_by(desc(UndoEvent.timestamp), desc(UndoEvent.id))
        )
        result = await self.session.execute(stmt)
        all_events = result.scalars().all()

        if len(all_events) <= max_events:
            return 0

        # Delete events beyond max_events
        events_to_delete = all_events[max_events:]
        count = len(events_to_delete)

        for event in events_to_delete:
            await self.session.delete(event)

        await self.session.commit()
        return count

    async def get_events(
        self,
        island_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[UndoEvent]:
        """Get undo events for an island with pagination."""
        stmt = (
            select(UndoEvent)
            .where(UndoEvent.island_id == island_id)
            .order_by(desc(UndoEvent.timestamp), desc(UndoEvent.id))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_event_count(self, island_id: str) -> int:
        """Get total count of events for an island."""
        stmt = select(UndoEvent).where(UndoEvent.island_id == island_id)
        result = await self.session.execute(stmt)
        return len(result.scalars().all())

    async def clear_all_events(self, island_id: str) -> int:
        """Delete all undo events for an island."""
        stmt = select(UndoEvent).where(UndoEvent.island_id == island_id)
        result = await self.session.execute(stmt)
        events = result.scalars().all()

        count = len(events)
        for event in events:
            await self.session.delete(event)

        await self.session.commit()
        return count
