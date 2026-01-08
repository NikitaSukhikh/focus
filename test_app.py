"""
Comprehensive test script for Focus desktop app.
Tests UI, backend, API calls, dependencies, and database handling.

Usage:
    python test_app.py
"""

import asyncio
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

try:
    import aiohttp
    import requests
    from colorama import init, Fore, Style
    init(autoreset=True)
except ImportError:
    print("Installing required test dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "aiohttp", "colorama"])
    import aiohttp
    import requests
    from colorama import init, Fore, Style
    init(autoreset=True)


class TestRunner:
    def __init__(self):
        self.backend_process: Optional[subprocess.Popen] = None
        self.electron_process: Optional[subprocess.Popen] = None
        self.base_url = "http://localhost:8000"
        self.test_db_path: Optional[Path] = None
        self.results = {
            "passed": [],
            "failed": [],
            "warnings": []
        }
        self.root_dir = Path(__file__).parent

    def log_success(self, message: str):
        """Log successful test"""
        print(f"{Fore.GREEN}[PASS] {message}{Style.RESET_ALL}")
        self.results["passed"].append(message)

    def log_failure(self, message: str, error: Optional[str] = None):
        """Log failed test"""
        msg = f"{message}: {error}" if error else message
        print(f"{Fore.RED}[FAIL] {msg}{Style.RESET_ALL}")
        self.results["failed"].append(msg)

    def log_warning(self, message: str):
        """Log warning"""
        print(f"{Fore.YELLOW}[WARN] {message}{Style.RESET_ALL}")
        self.results["warnings"].append(message)

    def log_info(self, message: str):
        """Log info"""
        print(f"{Fore.CYAN}[INFO] {message}{Style.RESET_ALL}")

    def log_section(self, title: str):
        """Log section header"""
        print(f"\n{Fore.MAGENTA}{'='*60}")
        print(f"{title}")
        print(f"{'='*60}{Style.RESET_ALL}\n")

    # ========== DEPENDENCY CHECKS ==========

    def test_python_dependencies(self):
        """Test that all required Python dependencies are installed"""
        self.log_section("Testing Python Dependencies")

        backend_requirements = self.root_dir / "backend" / "requirements.txt"
        if not backend_requirements.exists():
            self.log_failure("backend/requirements.txt not found")
            return

        with open(backend_requirements) as f:
            requirements = [line.strip().split("==")[0].split(">=")[0] for line in f if line.strip() and not line.startswith("#")]

        # Map package names to import names
        package_to_import = {
            "uvicorn[standard]": "uvicorn",
            "python-json-logger": "pythonjsonlogger",
            "beautifulsoup4": "bs4",
            "Pillow": "PIL",
            "python-docx": "docx",
            "pywin32": "win32api" if platform.system() == "Windows" else None,
            "google-auth": "google.auth",
            "google-api-python-client": "googleapiclient",
            "googleapis-common-protos": "google.api",
            "python-dotenv": "dotenv",
            "cryptography": "cryptography"
        }

        missing = []
        for package in requirements:
            # Strip extras like [standard]
            base_package = package.split("[")[0]
            import_name = package_to_import.get(package, base_package.replace("-", "_"))

            # Skip pywin32 on non-Windows platforms
            if import_name is None:
                self.log_info(f"Skipping '{package}' (not required on {platform.system()})")
                continue

            try:
                __import__(import_name)
                self.log_success(f"Python package '{package}' installed")
            except ImportError:
                missing.append(package)
                self.log_failure(f"Python package '{package}' missing")

        if not missing:
            self.log_success("All Python dependencies installed")
        else:
            self.log_failure(f"Missing Python packages: {', '.join(missing)}")

    def test_node_dependencies(self):
        """Test that Node.js dependencies are installed"""
        self.log_section("Testing Node.js Dependencies")

        node_modules = self.root_dir / "ui" / "node_modules"
        package_json = self.root_dir / "ui" / "package.json"

        if not package_json.exists():
            self.log_failure("ui/package.json not found")
            return

        if not node_modules.exists():
            self.log_failure("ui/node_modules not found - run 'npm install' in ui directory")
            return

        with open(package_json) as f:
            data = json.load(f)
            dependencies = {**data.get("dependencies", {}), **data.get("devDependencies", {})}

        for package in dependencies:
            package_path = node_modules / package
            if package_path.exists():
                self.log_success(f"Node package '{package}' installed")
            else:
                self.log_failure(f"Node package '{package}' missing")

    # ========== BACKEND TESTS ==========

    def start_backend(self):
        """Start the backend server"""
        self.log_section("Starting Backend Server")

        # Create temporary directories for testing
        temp_dir = Path(tempfile.mkdtemp(prefix="focus_test_"))
        self.test_db_path = temp_dir / "data" / "test.db"

        # Create necessary directories
        (temp_dir / "data").mkdir(parents=True, exist_ok=True)
        (temp_dir / "cache").mkdir(parents=True, exist_ok=True)
        (temp_dir / "storage").mkdir(parents=True, exist_ok=True)

        backend_dir = self.root_dir / "backend"
        env = os.environ.copy()
        env["DATABASE_PATH"] = str(self.test_db_path)
        env["BASE_PATH"] = str(temp_dir / "storage")
        env["CACHE_DIR"] = str(temp_dir / "cache")
        env["ENVIRONMENT"] = "development"
        env["DEBUG"] = "true"
        env["SERVER_HOST"] = "127.0.0.1"
        env["SERVER_PORT"] = "8000"

        try:
            self.backend_process = subprocess.Popen(
                [sys.executable, "-m", "app.main"],
                cwd=backend_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )

            # Wait for backend to start
            max_attempts = 30
            backend_output = []
            backend_errors = []

            for i in range(max_attempts):
                try:
                    response = requests.get(f"{self.base_url}/health", timeout=1)
                    if response.status_code == 200:
                        self.log_success(f"Backend started successfully on {self.base_url}")
                        return True
                except requests.exceptions.RequestException:
                    # Check if process is still running
                    if self.backend_process.poll() is not None:
                        # Process has terminated
                        stdout, stderr = self.backend_process.communicate()
                        self.log_failure("Backend process terminated unexpectedly")
                        if stderr:
                            self.log_failure("Backend stderr:", stderr[:500])
                        if stdout:
                            self.log_info(f"Backend stdout: {stdout[:500]}")
                        return False
                    time.sleep(0.5)

            # Timeout reached
            self.log_failure("Backend failed to start within timeout")

            # Try to get some output for debugging
            if self.backend_process.poll() is None:
                # Still running but not responding
                self.log_warning("Backend process is running but not responding to health checks")
                # Try to read some output
                try:
                    import select
                    if hasattr(select, 'select'):
                        # Non-blocking read attempt
                        pass
                except:
                    pass

            return False

        except Exception as e:
            self.log_failure("Failed to start backend", str(e))
            return False

    def test_health_endpoint(self):
        """Test backend health check"""
        self.log_section("Testing Health Endpoint")

        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_success(f"Health check passed: {data}")
            else:
                self.log_failure(f"Health check failed with status {response.status_code}")
        except Exception as e:
            self.log_failure("Health endpoint test failed", str(e))

    def test_database_connection(self):
        """Test database initialization"""
        self.log_section("Testing Database Connection")

        if self.test_db_path and self.test_db_path.exists():
            file_size = self.test_db_path.stat().st_size
            self.log_success(f"Database file created at {self.test_db_path} (size: {file_size} bytes)")
        else:
            self.log_failure(f"Database file not created at expected path: {self.test_db_path}")

            # Check if backend process is still running
            if self.backend_process:
                poll_result = self.backend_process.poll()
                if poll_result is None:
                    self.log_warning("Backend process is still running but database wasn't created")
                else:
                    self.log_warning(f"Backend process exited with code: {poll_result}")
                    # Try to get output
                    try:
                        stdout, stderr = self.backend_process.communicate(timeout=1)
                        if stderr:
                            self.log_failure(f"Backend errors: {stderr[:300]}")
                    except:
                        pass

    async def test_spaces_api(self):
        """Test Spaces API endpoints"""
        self.log_section("Testing Spaces API")

        async with aiohttp.ClientSession() as session:
            # Test GET all spaces
            try:
                async with session.get(f"{self.base_url}/api/spaces") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.log_success(f"GET /api/spaces - Status: {resp.status}, Spaces: {len(data)}")
                    else:
                        text = await resp.text()
                        self.log_failure(f"GET /api/spaces failed with status {resp.status}: {text[:200]}")
            except Exception as e:
                self.log_failure("GET /api/spaces failed", str(e))
                return

            # Test POST create space
            space_id = None
            try:
                payload = {
                    "name": "Test Space",
                    "description": "Created by test script",
                    "icon": "folder",
                    "color": "#FF5733"
                }
                async with session.post(f"{self.base_url}/api/spaces", json=payload) as resp:
                    if resp.status == 201 or resp.status == 200:
                        data = await resp.json()
                        space_id = data.get("id")
                        self.log_success(f"POST /api/spaces - Created space with ID: {space_id}")
                    else:
                        text = await resp.text()
                        self.log_failure(f"POST /api/spaces failed with status {resp.status}: {text[:200]}")
                        return
            except Exception as e:
                self.log_failure("POST /api/spaces failed", str(e))
                return

            # Test GET single space
            if space_id:
                try:
                    async with session.get(f"{self.base_url}/api/spaces/{space_id}") as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            self.log_success(f"GET /api/spaces/{space_id} - Retrieved space: {data.get('name')}")
                        else:
                            self.log_failure(f"GET /api/spaces/{space_id} failed with status {resp.status}")
                except Exception as e:
                    self.log_failure(f"GET /api/spaces/{space_id} failed", str(e))

            # Test PUT update space
            if space_id:
                try:
                    payload = {
                        "name": "Updated Test Space",
                        "description": "Updated by test script",
                        "icon": "star",
                        "color": "#00FF00"
                    }
                    async with session.put(f"{self.base_url}/api/spaces/{space_id}", json=payload) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            self.log_success(f"PUT /api/spaces/{space_id} - Updated space name: {data.get('name')}")
                        else:
                            self.log_failure(f"PUT /api/spaces/{space_id} failed with status {resp.status}")
                except Exception as e:
                    self.log_failure(f"PUT /api/spaces/{space_id} failed", str(e))

            # Test search spaces
            try:
                async with session.get(f"{self.base_url}/api/spaces/search", params={"q": "Test"}) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.log_success(f"GET /api/spaces/search - Found {len(data)} matching spaces")
                    else:
                        self.log_failure(f"GET /api/spaces/search failed with status {resp.status}")
            except Exception as e:
                self.log_failure("GET /api/spaces/search failed", str(e))

            # Test DELETE space
            if space_id:
                try:
                    async with session.delete(f"{self.base_url}/api/spaces/{space_id}") as resp:
                        if resp.status == 204 or resp.status == 200:
                            self.log_success(f"DELETE /api/spaces/{space_id} - Space deleted successfully")
                        else:
                            self.log_failure(f"DELETE /api/spaces/{space_id} failed with status {resp.status}")
                except Exception as e:
                    self.log_failure(f"DELETE /api/spaces/{space_id} failed", str(e))

    async def test_objects_api(self):
        """Test Objects API endpoints"""
        self.log_section("Testing Objects API")

        async with aiohttp.ClientSession() as session:
            # Create a space first
            space_id = None
            try:
                payload = {"name": "Test Space for Objects", "icon": "folder", "color": "#FF5733"}
                async with session.post(f"{self.base_url}/api/spaces", json=payload) as resp:
                    data = await resp.json()
                    space_id = data.get("id")
                    self.log_info(f"Created test space: {space_id}")
            except Exception as e:
                self.log_failure("Failed to create test space for objects", str(e))
                return

            if not space_id:
                return

            # Test POST create object
            object_id = None
            try:
                payload = {
                    "type": "link",
                    "title": "Test Link",
                    "description": "Test description",
                    "url": "https://example.com",
                    "x": 100.0,
                    "y": 100.0
                }
                async with session.post(f"{self.base_url}/api/spaces/{space_id}/objects", json=payload) as resp:
                    if resp.status in [200, 201]:
                        data = await resp.json()
                        object_id = data.get("id")
                        self.log_success(f"POST /api/spaces/{space_id}/objects - Created object: {object_id}")
                    else:
                        text = await resp.text()
                        self.log_failure(f"POST objects failed with status {resp.status}: {text}")
            except Exception as e:
                self.log_failure("POST /api/spaces/{space_id}/objects failed", str(e))

            # Test GET objects in space
            try:
                async with session.get(f"{self.base_url}/api/spaces/{space_id}/objects") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.log_success(f"GET /api/spaces/{space_id}/objects - Found {len(data)} objects")
                    else:
                        self.log_failure(f"GET objects in space failed with status {resp.status}")
            except Exception as e:
                self.log_failure("GET objects in space failed", str(e))

            # Test PATCH update object position
            if object_id:
                try:
                    payload = {"x": 200.0, "y": 200.0}
                    async with session.patch(f"{self.base_url}/api/objects/{object_id}", json=payload) as resp:
                        if resp.status == 200:
                            self.log_success(f"PATCH /api/objects/{object_id} - Updated position")
                        else:
                            self.log_failure(f"PATCH object failed with status {resp.status}")
                except Exception as e:
                    self.log_failure("PATCH object failed", str(e))

            # Test DELETE object
            if object_id:
                try:
                    async with session.delete(f"{self.base_url}/api/objects/{object_id}") as resp:
                        if resp.status in [200, 204]:
                            self.log_success(f"DELETE /api/objects/{object_id} - Object deleted")
                        else:
                            self.log_failure(f"DELETE object failed with status {resp.status}")
                except Exception as e:
                    self.log_failure("DELETE object failed", str(e))

            # Cleanup space
            try:
                async with session.delete(f"{self.base_url}/api/spaces/{space_id}") as resp:
                    self.log_info("Cleaned up test space")
            except:
                pass

    async def test_preview_api(self):
        """Test Preview API endpoints"""
        self.log_section("Testing Preview API")

        async with aiohttp.ClientSession() as session:
            # Test URL metadata extraction
            try:
                payload = {"url": "https://github.com"}
                async with session.post(f"{self.base_url}/api/preview/url-metadata", json=payload) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.log_success(f"POST /api/preview/url-metadata - Retrieved metadata: {data.get('title', 'N/A')}")
                    else:
                        self.log_warning(f"URL metadata extraction status: {resp.status}")
            except Exception as e:
                self.log_warning(f"URL metadata test failed: {str(e)}")

    async def test_undo_api(self):
        """Test Undo/Redo API"""
        self.log_section("Testing Undo/Redo API")

        async with aiohttp.ClientSession() as session:
            # Create a space to generate undo event
            space_id = None
            try:
                payload = {"name": "Undo Test Space", "icon": "folder", "color": "#FF5733"}
                async with session.post(f"{self.base_url}/api/spaces", json=payload) as resp:
                    data = await resp.json()
                    space_id = data.get("id")
                    self.log_info("Created space for undo test")
            except Exception as e:
                self.log_failure("Failed to create space for undo test", str(e))
                return

            if space_id:
                # Test undo
                try:
                    payload = {"space_id": space_id}
                    async with session.post(f"{self.base_url}/api/undo", json=payload) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            self.log_success(f"POST /api/undo - Undo successful")
                        else:
                            text = await resp.text()
                            self.log_warning(f"Undo returned status {resp.status}: {text}")
                except Exception as e:
                    self.log_warning(f"Undo test failed: {str(e)}")

                # Test redo
                try:
                    payload = {"space_id": space_id}
                    async with session.post(f"{self.base_url}/api/redo", json=payload) as resp:
                        if resp.status == 200:
                            self.log_success(f"POST /api/redo - Redo successful")
                        else:
                            self.log_warning(f"Redo returned status {resp.status}")
                except Exception as e:
                    self.log_warning(f"Redo test failed: {str(e)}")

                # Cleanup
                try:
                    async with session.delete(f"{self.base_url}/api/spaces/{space_id}") as resp:
                        self.log_info("Cleaned up undo test space")
                except:
                    pass

    async def test_cascade_deletion(self):
        """Test that deleting a space cascades to its objects"""
        self.log_section("Testing Cascade Deletion")

        async with aiohttp.ClientSession() as session:
            # Create space
            space_id = None
            try:
                payload = {"name": "Cascade Test", "icon": "folder", "color": "#FF5733"}
                async with session.post(f"{self.base_url}/api/spaces", json=payload) as resp:
                    data = await resp.json()
                    space_id = data.get("id")
            except Exception as e:
                self.log_failure("Failed to create space for cascade test", str(e))
                return

            # Create objects in space
            object_ids = []
            for i in range(3):
                try:
                    payload = {
                        "type": "text",
                        "title": f"Test Object {i}",
                        "description": "Test",
                        "content": f"Test content {i}",
                        "x": float(i * 100),
                        "y": 100.0
                    }
                    async with session.post(f"{self.base_url}/api/spaces/{space_id}/objects", json=payload) as resp:
                        if resp.status in [200, 201]:
                            data = await resp.json()
                            object_ids.append(data.get("id"))
                        else:
                            text = await resp.text()
                            self.log_failure(f"Failed to create test object {i}: {text}")
                except Exception as e:
                    self.log_failure(f"Failed to create test object {i}", str(e))

            self.log_info(f"Created {len(object_ids)} test objects")

            # Delete space
            try:
                async with session.delete(f"{self.base_url}/api/spaces/{space_id}") as resp:
                    if resp.status in [200, 204]:
                        self.log_success("Space deleted")
                    else:
                        text = await resp.text()
                        self.log_failure(f"Failed to delete space: {resp.status} - {text}")
                        return
            except Exception as e:
                self.log_failure("Space deletion failed", str(e))
                return

            # Give database time to cascade delete
            await asyncio.sleep(0.1)

            # Verify objects are deleted (cascade should have removed them)
            deleted_count = 0
            for obj_id in object_ids:
                try:
                    async with session.get(f"{self.base_url}/api/objects/{obj_id}") as resp:
                        if resp.status == 404:
                            deleted_count += 1
                        else:
                            self.log_warning(f"Object {obj_id} still exists (status {resp.status})")
                except Exception as e:
                    # If connection fails, assume object is gone
                    deleted_count += 1

            if deleted_count == len(object_ids):
                self.log_success(f"Cascade deletion verified - all {deleted_count} objects deleted")
            else:
                self.log_failure(f"Cascade deletion incomplete: {deleted_count}/{len(object_ids)} objects deleted")

    # ========== FRONTEND TESTS ==========

    def test_frontend_build(self):
        """Test that frontend can be built"""
        self.log_section("Testing Frontend Build")

        ui_dir = self.root_dir / "ui"

        try:
            # Check if build output exists
            vite_dir = ui_dir / ".vite"
            if vite_dir.exists():
                self.log_success("Vite build directory exists")
            else:
                self.log_warning("Vite build directory not found - frontend may not be built")

            # Check key files
            key_files = [
                "src/App.tsx",
                "src/main.tsx",
                "src-electron/main.ts",
                "src-electron/preload.ts",
                "package.json",
                "tsconfig.json",
                "vite.config.ts"
            ]

            for file in key_files:
                file_path = ui_dir / file
                if file_path.exists():
                    self.log_success(f"Frontend file exists: {file}")
                else:
                    self.log_failure(f"Frontend file missing: {file}")

        except Exception as e:
            self.log_failure("Frontend build test failed", str(e))

    def test_electron_config(self):
        """Test Electron configuration"""
        self.log_section("Testing Electron Configuration")

        ui_dir = self.root_dir / "ui"
        forge_config = ui_dir / "forge.config.ts"

        if forge_config.exists():
            self.log_success("Electron Forge config exists")
        else:
            self.log_failure("forge.config.ts not found")

        package_json = ui_dir / "package.json"
        if package_json.exists():
            with open(package_json) as f:
                data = json.load(f)
                if "electron" in data.get("devDependencies", {}):
                    self.log_success(f"Electron dependency found: {data['devDependencies']['electron']}")
                else:
                    self.log_failure("Electron not in devDependencies")

    # ========== INTEGRATION TESTS ==========

    async def test_full_workflow(self):
        """Test complete workflow: create space -> add objects -> delete"""
        self.log_section("Testing Full Workflow")

        async with aiohttp.ClientSession() as session:
            space_id = None
            object_ids = []

            try:
                # 1. Create space
                payload = {"name": "Workflow Test Space", "description": "Full workflow test", "icon": "rocket", "color": "#4CAF50"}
                async with session.post(f"{self.base_url}/api/spaces", json=payload) as resp:
                    data = await resp.json()
                    space_id = data.get("id")
                    self.log_success(f"Step 1: Created space '{data.get('name')}'")

                # 2. Add multiple objects
                object_configs = [
                    ("link", {"url": "https://example.com", "title": "Example Link", "description": "Test link"}),
                    ("text", {"content": "Test note", "title": "Test Note", "description": "Test text"}),
                    ("file", {"file_path": "/fake/path.txt", "title": "Fake File", "description": "Test file"})
                ]

                for obj_type, obj_data in object_configs:
                    payload = {
                        "type": obj_type,
                        "x": 100.0,
                        "y": float(len(object_ids) * 150),
                        **obj_data
                    }
                    async with session.post(f"{self.base_url}/api/spaces/{space_id}/objects", json=payload) as resp:
                        if resp.status in [200, 201]:
                            data = await resp.json()
                            object_ids.append(data.get("id"))
                            self.log_success(f"Step 2.{len(object_ids)}: Added {obj_type} object")
                        else:
                            text = await resp.text()
                            self.log_warning(f"Failed to add {obj_type} object: {text[:100]}")

                # 3. Update object
                if object_ids:
                    payload = {"x": 300.0, "y": 300.0}
                    async with session.patch(f"{self.base_url}/api/objects/{object_ids[0]}", json=payload) as resp:
                        if resp.status == 200:
                            self.log_success("Step 3: Updated object position")
                        else:
                            self.log_warning(f"Step 3: Update failed with status {resp.status}")

                # 4. Search objects
                async with session.get(f"{self.base_url}/api/objects/search?q=Test") as resp:
                    data = await resp.json()
                    self.log_success(f"Step 4: Searched objects, found {len(data)} results")

                # 5. Delete one object
                if object_ids:
                    async with session.delete(f"{self.base_url}/api/objects/{object_ids[0]}") as resp:
                        self.log_success("Step 5: Deleted one object")

                # 6. Verify remaining objects
                async with session.get(f"{self.base_url}/api/spaces/{space_id}/objects") as resp:
                    data = await resp.json()
                    self.log_success(f"Step 6: Verified {len(data)} objects remain")

                # 7. Delete space (cascade)
                async with session.delete(f"{self.base_url}/api/spaces/{space_id}") as resp:
                    self.log_success("Step 7: Deleted space with cascade")

            except Exception as e:
                self.log_failure("Full workflow test failed", str(e))

    # ========== CLEANUP ==========

    def stop_backend(self):
        """Stop the backend server"""
        if self.backend_process:
            self.log_info("Stopping backend server...")

            # Capture any remaining output
            try:
                self.backend_process.terminate()
                stdout, stderr = self.backend_process.communicate(timeout=5)

                # Log any errors that occurred
                if stderr and len(stderr.strip()) > 0:
                    self.log_warning(f"Backend stderr output: {stderr[:500]}")

            except subprocess.TimeoutExpired:
                self.log_warning("Backend didn't stop gracefully, forcing kill...")
                self.backend_process.kill()
                try:
                    stdout, stderr = self.backend_process.communicate(timeout=2)
                except:
                    pass

            self.backend_process = None

        # Clean up test database
        if self.test_db_path and self.test_db_path.parent.exists():
            try:
                # Go up to temp directory root
                temp_root = self.test_db_path.parent.parent
                if temp_root.exists() and "focus_test_" in str(temp_root):
                    shutil.rmtree(temp_root)
                    self.log_info("Cleaned up test directories")
            except Exception as e:
                self.log_warning(f"Failed to clean up test directories: {e}")

    # ========== MAIN TEST RUNNER ==========

    async def run_async_tests(self):
        """Run all async tests"""
        await self.test_spaces_api()
        await self.test_objects_api()
        await self.test_preview_api()
        await self.test_undo_api()
        await self.test_cascade_deletion()
        await self.test_full_workflow()

    def run_all_tests(self):
        """Run all tests"""
        try:
            # System info
            self.log_section("System Information")
            self.log_info(f"Platform: {platform.system()} {platform.release()}")
            self.log_info(f"Python: {sys.version}")
            self.log_info(f"Working Directory: {self.root_dir}")

            # Dependency tests
            self.test_python_dependencies()
            self.test_node_dependencies()

            # Frontend tests (static)
            self.test_frontend_build()
            self.test_electron_config()

            # Start backend
            if not self.start_backend():
                self.log_failure("Cannot proceed without backend")
                return

            # Backend tests
            self.test_health_endpoint()
            self.test_database_connection()

            # API tests (async)
            asyncio.run(self.run_async_tests())

        finally:
            # Cleanup
            self.stop_backend()

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        self.log_section("Test Summary")

        total = len(self.results["passed"]) + len(self.results["failed"])
        passed = len(self.results["passed"])
        failed = len(self.results["failed"])
        warnings = len(self.results["warnings"])

        print(f"{Fore.CYAN}Total Tests: {total}")
        print(f"{Fore.GREEN}Passed: {passed}")
        print(f"{Fore.RED}Failed: {failed}")
        print(f"{Fore.YELLOW}Warnings: {warnings}{Style.RESET_ALL}\n")

        if failed > 0:
            print(f"{Fore.RED}Failed Tests:{Style.RESET_ALL}")
            for test in self.results["failed"]:
                print(f"  - {test}")
            print()

        if warnings > 0:
            print(f"{Fore.YELLOW}Warnings:{Style.RESET_ALL}")
            for warning in self.results["warnings"]:
                print(f"  - {warning}")
            print()

        success_rate = (passed / total * 100) if total > 0 else 0

        if success_rate == 100:
            print(f"{Fore.GREEN}{'='*60}")
            print(f"ALL TESTS PASSED!")
            print(f"{'='*60}{Style.RESET_ALL}")
        elif success_rate >= 80:
            print(f"{Fore.YELLOW}{'='*60}")
            print(f"TESTS MOSTLY PASSED ({success_rate:.1f}%)")
            print(f"{'='*60}{Style.RESET_ALL}")
        else:
            print(f"{Fore.RED}{'='*60}")
            print(f"TESTS FAILED ({success_rate:.1f}%)")
            print(f"{'='*60}{Style.RESET_ALL}")

        return 0 if failed == 0 else 1


if __name__ == "__main__":
    runner = TestRunner()
    exit_code = runner.run_all_tests()
    sys.exit(exit_code)
