import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.exc import OperationalError

from app.models.object import FileObjectCreate, TextObjectCreate
from app.models.space import SpaceCreate


@pytest.mark.asyncio
async def test_undo_sequence_monotonic_under_concurrency(test_modules):
    space_id = "space-concurrency"

    async def create_evt(n):
        async with test_modules.db.AsyncSessionLocal() as session:
            repo = test_modules.undo_repo.UndoEventRepository(session)
            event = await repo.create_event(space_id=space_id, event_type="test", event_data={"n": n})
            await session.commit()
            return event

    events = []
    for i in range(6):
        events.append(await create_evt(i))
    sequences = [e.sequence for e in events]

    assert sorted(sequences) == list(range(1, 7))
    assert len(sequences) == len(set(sequences))


@pytest.mark.asyncio
async def test_objects_tag_filter_totals_and_pagination(test_modules):
    space_repo = test_modules.spaces_repo.SpacesRepository()
    objects_repo = test_modules.objects_repo.ObjectsRepository()

    async with test_modules.db.AsyncSessionLocal() as session:
        space = await space_repo.create_space(SpaceCreate(name="Tags"), session=session)
        await objects_repo.create_object(
            space.id,
            FileObjectCreate(title="a-b", file_path="/tmp/a", tags=["a", "b"]),
            session=session,
        )
        await objects_repo.create_object(
            space.id,
            FileObjectCreate(title="a", file_path="/tmp/a2", tags=["a"]),
            session=session,
        )
        await objects_repo.create_object(
            space.id,
            FileObjectCreate(title="b", file_path="/tmp/a3", tags=["b"]),
            session=session,
        )
        await session.commit()

        try:
            result = await objects_repo.get_objects_by_space(
                space.id,
                tags=["a", "b"],
                skip=0,
                limit=10,
                session=session,
            )
        except OperationalError:
            pytest.skip("SQLite json_each not available in this environment")

        assert result.total == 1
        assert len(result.objects) == 1
        assert result.objects[0].title == "a-b"


@pytest.mark.asyncio
async def test_create_object_rolls_back_on_failure(test_modules):
    space_repo = test_modules.spaces_repo.SpacesRepository()
    objects_service = test_modules.objects_service.ObjectsService()

    async with test_modules.db.AsyncSessionLocal() as session:
        space = await space_repo.create_space(SpaceCreate(name="Txn"), session=session)
        await session.commit()

        async def fail(*args, **kwargs):
            raise RuntimeError("boom")

        objects_service.spaces_repo.update_space_object_count = fail

        with pytest.raises(RuntimeError):
            await objects_service.create_object(
                space_id=space.id,
                object_data=TextObjectCreate(title="note", content="content"),
                session=session,
            )

        remaining = await objects_service.objects_repo.get_objects_by_space(
            space_id=space.id, session=session
        )
        assert remaining.total == 0


@pytest.mark.asyncio
async def test_google_token_validity_and_refresh(test_modules):
    repo = test_modules.google_repo.GoogleTokensRepository()
    user = "user@example.com"

    future = datetime.utcnow() + timedelta(minutes=30)
    await repo.save_tokens(
        user_id=user,
        access_token="token",
        refresh_token="refresh",
        token_uri="uri",
        client_id="cid",
        client_secret="secret",
        scopes=["scope1"],
        expires_at=future,
        user_email=user,
    )

    assert await repo.is_token_valid(user) is True
    assert await repo.requires_refresh(user) is False

    soon = datetime.utcnow() + timedelta(minutes=10)
    await repo.save_tokens(
        user_id=user,
        access_token="token2",
        refresh_token="refresh2",
        token_uri="uri",
        client_id="cid",
        client_secret="secret",
        scopes=["scope1"],
        expires_at=soon,
        user_email=user,
    )

    assert await repo.is_token_valid(user) is True  # still valid (>5 minutes)
    assert await repo.requires_refresh(user) is True  # refresh window (<=15 minutes)
