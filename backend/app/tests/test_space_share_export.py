"""
Space share export tests.

Why: backend now owns share ordering, payload formatting, and file size warnings,
so these tests lock in that behavior independently of UI rendering.
"""

from pathlib import Path
import importlib
from types import SimpleNamespace

import pytest
import pytest_asyncio

from app.models.object import FileObjectCreate, LinkObjectCreate, TextObjectCreate, WebArticleObjectCreate
from app.models.space import SpaceCreate, SpaceShareExportRequest


@pytest_asyncio.fixture
async def test_modules(tmp_path, monkeypatch):
    """
    Local lightweight test modules fixture.

    Why: the shared suite fixture currently imports optional repositories that may
    be absent in lean backend environments, so this test keeps only required modules.
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
    import app.services.spaces_service as spaces_service

    for mod in (objects_repo, spaces_repo, spaces_service):
        importlib.reload(mod)

    return SimpleNamespace(
        db=db,
        objects_repo=objects_repo,
        spaces_repo=spaces_repo,
        spaces_service=spaces_service,
    )


@pytest.mark.asyncio
async def test_export_space_share_orders_objects_and_formats_share_text(test_modules, tmp_path: Path):
    space_repo = test_modules.spaces_repo.SpacesRepository()
    objects_repo = test_modules.objects_repo.ObjectsRepository()
    space_service = test_modules.spaces_service.SpacesService()

    file_path = tmp_path / "share-file.txt"
    file_path.write_text("share-file-content", encoding="utf-8")

    async with test_modules.db.AsyncSessionLocal() as session:
        space = await space_repo.create_space(SpaceCreate(name="Share Export"), session=session)

        # Insert out of category order to verify service-level reordering.
        await objects_repo.create_object(
            space.id,
            TextObjectCreate(title="Note", content="Remember this text"),
            session=session,
        )
        await objects_repo.create_object(
            space.id,
            FileObjectCreate(title="Document", file_path=str(file_path)),
            session=session,
        )
        await objects_repo.create_object(
            space.id,
            WebArticleObjectCreate(title="Article", url="https://example.org/article"),
            session=session,
        )
        await objects_repo.create_object(
            space.id,
            LinkObjectCreate(title="Link", url="https://example.com"),
            session=session,
        )
        await session.commit()

        result = await space_service.export_space_share(
            space.id,
            SpaceShareExportRequest(
                links=True,
                web_articles=True,
                files=True,
                text_notes=True,
            ),
            session=session,
        )

    assert [item.category for item in result.items] == ["links", "web_articles", "files", "text_notes"]
    assert result.share_text == "\n\n".join([item.share_data for item in result.items if item.share_data])
    assert result.share_text.count("\n\n") == 3
    assert list(result.organized_data["links"].keys()) == ["link_1"]
    assert list(result.organized_data["web_articles"].keys()) == ["web_article_1"]
    assert list(result.organized_data["files"].keys()) == ["file_1"]
    assert list(result.organized_data["text_notes"].keys()) == ["text_note_1"]


@pytest.mark.asyncio
async def test_export_space_share_defaults_to_all_filters_when_none_selected(test_modules):
    space_repo = test_modules.spaces_repo.SpacesRepository()
    objects_repo = test_modules.objects_repo.ObjectsRepository()
    space_service = test_modules.spaces_service.SpacesService()

    async with test_modules.db.AsyncSessionLocal() as session:
        space = await space_repo.create_space(SpaceCreate(name="Default Filters"), session=session)
        await objects_repo.create_object(
            space.id,
            LinkObjectCreate(title="Link", url="https://example.com/default"),
            session=session,
        )
        await objects_repo.create_object(
            space.id,
            TextObjectCreate(title="Note", content="Some note"),
            session=session,
        )
        await session.commit()

        result = await space_service.export_space_share(
            space.id,
            SpaceShareExportRequest(),
            session=session,
        )

    assert result.filters.links is True
    assert result.filters.web_articles is True
    assert result.filters.files is True
    assert result.filters.text_notes is True
    assert result.total_items == 2


@pytest.mark.asyncio
async def test_export_space_share_warns_when_file_exceeds_size_limit(test_modules, tmp_path: Path):
    space_repo = test_modules.spaces_repo.SpacesRepository()
    objects_repo = test_modules.objects_repo.ObjectsRepository()
    space_service = test_modules.spaces_service.SpacesService()
    space_service.MAX_SHARE_FILE_SIZE_BYTES = 5

    file_path = tmp_path / "large-share-file.bin"
    file_path.write_bytes(b"1234567890")

    async with test_modules.db.AsyncSessionLocal() as session:
        space = await space_repo.create_space(SpaceCreate(name="File Limits"), session=session)
        await objects_repo.create_object(
            space.id,
            FileObjectCreate(title="Too Large File", file_path=str(file_path)),
            session=session,
        )
        await session.commit()

        result = await space_service.export_space_share(
            space.id,
            SpaceShareExportRequest(files=True),
            session=session,
        )

    assert result.total_items == 1
    assert result.items[0].is_too_large is True
    assert any("too large" in warning.lower() for warning in result.warnings)


@pytest.mark.asyncio
async def test_export_space_share_deduplicates_files_by_path(test_modules, tmp_path: Path):
    space_repo = test_modules.spaces_repo.SpacesRepository()
    objects_repo = test_modules.objects_repo.ObjectsRepository()
    space_service = test_modules.spaces_service.SpacesService()

    file_path = tmp_path / "duplicate-file.txt"
    file_path.write_text("same file", encoding="utf-8")

    async with test_modules.db.AsyncSessionLocal() as session:
        space = await space_repo.create_space(SpaceCreate(name="Deduplicate Files"), session=session)
        await objects_repo.create_object(
            space.id,
            FileObjectCreate(title="Duplicate 1", file_path=str(file_path)),
            session=session,
        )
        await objects_repo.create_object(
            space.id,
            FileObjectCreate(title="Duplicate 2", file_path=str(file_path)),
            session=session,
        )
        await session.commit()

        result = await space_service.export_space_share(
            space.id,
            SpaceShareExportRequest(files=True),
            session=session,
        )

    assert result.total_items == 1
    assert len(result.items) == 1
    assert result.items[0].file_path == str(file_path)
