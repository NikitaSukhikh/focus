import importlib
import pathlib
import sys
from types import SimpleNamespace

import pytest_asyncio


@pytest_asyncio.fixture
async def test_modules(tmp_path, monkeypatch):
    """
    Provide isolated modules and DB per test to avoid cross-test contamination.
    """
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("ENCRYPTION_KEY", "x" * 32)

    from app.core import config

    config.reset_settings()

    import app.storage.db as db

    importlib.reload(db)

    async with db.engine.begin() as conn:
        await conn.run_sync(db.Base.metadata.create_all)

    import app.storage.repositories.objects_repo as objects_repo
    import app.storage.repositories.spaces_repo as spaces_repo
    import app.storage.repositories.undo_repo as undo_repo
    import app.storage.repositories.google_repo as google_repo
    import app.services.objects_service as objects_service
    import app.services.spaces_service as spaces_service

    for mod in (objects_repo, spaces_repo, undo_repo, google_repo, objects_service, spaces_service):
        importlib.reload(mod)

    return SimpleNamespace(
        db=db,
        objects_repo=objects_repo,
        spaces_repo=spaces_repo,
        undo_repo=undo_repo,
        google_repo=google_repo,
        objects_service=objects_service,
        spaces_service=spaces_service,
    )
ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
