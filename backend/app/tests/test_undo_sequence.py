import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

import sys
import pathlib

# Ensure project root is on sys.path so "app" package is importable when running tests directly.
ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.storage.db import UndoEvent, AsyncSessionLocal
from app.storage.repositories.undo_repo import UndoEventRepository


@pytest.mark.asyncio
async def test_undo_redo_sequence_ordering():
    """Ensure undo selects the highest applied sequence and redo the lowest undone sequence."""
    island_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:  # type: AsyncSession
        repo = UndoEventRepository(session)

        # Seed events with explicit sequences (simulating insert order)
        await _insert_event(repo, island_id, sequence=1, event_type="tile_create")
        await _insert_event(repo, island_id, sequence=2, event_type="tile_move")
        await _insert_event(repo, island_id, sequence=3, event_type="text_move")

        # Undo should return the highest sequence not undone (3), then (2), then (1)
        e3 = await repo.get_last_undoable_event(island_id)
        assert e3.sequence == 3 and e3.event_type == "text_move"
        await repo.mark_as_undone(e3.id)

        e2 = await repo.get_last_undoable_event(island_id)
        assert e2.sequence == 2 and e2.event_type == "tile_move"
        await repo.mark_as_undone(e2.id)

        e1 = await repo.get_last_undoable_event(island_id)
        assert e1.sequence == 1 and e1.event_type == "tile_create"
        await repo.mark_as_undone(e1.id)

        # Redo should return the lowest undone (1) first, then (2)
        r1 = await repo.get_last_redoable_event(island_id)
        assert r1.sequence == 1 and r1.event_type == "tile_create"
        await repo.mark_as_not_undone(r1.id)

        r2 = await repo.get_last_redoable_event(island_id)
        assert r2.sequence == 2 and r2.event_type == "tile_move"
        await repo.mark_as_not_undone(r2.id)

        r3 = await repo.get_last_redoable_event(island_id)
        assert r3.sequence == 3 and r3.event_type == "text_move"


async def _insert_event(repo: UndoEventRepository, island_id: str, sequence: int, event_type: str):
    event = UndoEvent(
        id=str(uuid.uuid4()),
        island_id=island_id,
        sequence=sequence,
        event_type=event_type,
        event_data={},
        is_undone=False,
    )
    repo.session.add(event)
    await repo.session.commit()
    await repo.session.refresh(event)
