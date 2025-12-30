"""
Integration test for space creation/rename flow.

This spins up the FastAPI app with a temp SQLite DB path, creates an space,
renames it, and asserts the updated name is returned immediately from list.
"""

import importlib
from uuid import UUID

from fastapi.testclient import TestClient

from app.core.config import reset_settings


def _reload_app():
    """Reload app.main so it picks up fresh env + settings."""
    import app.main

    importlib.reload(app.main)
    return app.main.app


def test_create_and_rename_space_uses_latest_name(tmp_path, monkeypatch):
    # Point database to a fresh temp file and reset cached settings.
    db_path = tmp_path / "test_focus.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))
    reset_settings()

    app = _reload_app()
    client = TestClient(app)

    # Create an space
    create_resp = client.post("/api/spaces", json={"name": "Temp Space"})
    assert create_resp.status_code == 201, create_resp.text
    created = create_resp.json()

    # Rename it
    new_name = "Renamed Space"
    update_resp = client.put(f"/api/spaces/{created['id']}", json={"name": new_name})
    assert update_resp.status_code == 200, update_resp.text

    # List should show the new name immediately
    list_resp = client.get("/api/spaces")
    assert list_resp.status_code == 200, list_resp.text
    names = [item["name"] for item in list_resp.json().get("spaces", [])]
    assert new_name in names

    # Basic shape checks
    assert UUID(created["id"])  # valid UUID
    assert created["name"] == "Temp Space"
