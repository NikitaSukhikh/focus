 Tauri Shell (Required)
 
Tauri itself is built in Rust. The src-tauri/ folder contains Rust code that handles:
ui/
└── src-tauri/
    └── src/
        ├── main.rs         # App entry, window creation
        ├── tray.rs         # System tray icon and menu
        ├── hotkeys.rs      # Global keyboard shortcuts
        ├── window.rs       # Window positioning, focus
        └── commands.rs     # Tauri commands (Rust ↔ JavaScript bridge)
This is minimal Rust—mostly configuration and glue code.
Example: System tray setup
rust// src-tauri/src/tray.rs

use tauri::{
    CustomMenuItem, SystemTray, SystemTrayMenu, 
    SystemTrayMenuItem, SystemTrayEvent
};

pub fn create_tray() -> SystemTray {
    let show = CustomMenuItem::new("show".to_string(), "Show Alfy");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    SystemTray::new().with_menu(tray_menu)
}

pub fn handle_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        }
        _ => {}
    }
}
```

---

## 2. Performance-Critical Helpers (Optional)

Some tasks are too slow or CPU-intensive for Python. Rust can handle these as small standalone binaries or Python extensions.

### Candidate Tasks for Rust:

| Task | Why Rust? | Implementation |
|------|-----------|----------------|
| **Activity Monitor** | Polls active window every 1-2 seconds, needs to be lightweight | Standalone daemon |
| **File Watcher** | Watches directories for changes, high event throughput | Standalone daemon |
| **File Indexer** | Initial scan of thousands of files, content hashing | CLI tool or Python extension |
| **Embeddings Search** | Vector similarity over large indexes | Python extension (PyO3) |

### Architecture with Rust Helpers
```
┌─────────────────────────────────────────────────────────────────────┐
│                           ALFY SYSTEM                               │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     HTTP/WS      ┌──────────────────────────────┐
│   Tauri + React  │◄────────────────►│       Python Backend         │
│   (Rust shell)   │  localhost:8420  │       (FastAPI + LLM)        │
└──────────────────┘                  └──────────────────────────────┘
                                                    │
                                                    │ Calls via:
                                                    │ • subprocess
                                                    │ • PyO3 extension
                                                    │ • IPC (stdin/stdout)
                                                    ▼
                                      ┌──────────────────────────────┐
                                      │       Rust Helpers           │
                                      │                              │
                                      │  • alfy-activity-monitor     │
                                      │  • alfy-file-watcher         │
                                      │  • alfy-indexer              │
                                      └──────────────────────────────┘
```

---

## Example: Activity Monitor in Rust

A lightweight daemon that tracks the active window and reports to Python.
```
alfy-helpers/
└── activity-monitor/
    ├── Cargo.toml
    └── src/
        └── main.rs
rust// alfy-helpers/activity-monitor/src/main.rs

use std::time::Duration;
use std::thread;
use serde::Serialize;
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId
};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION
};

#[derive(Serialize)]
struct ActivityEvent {
    timestamp: String,
    app_name: String,
    window_title: String,
    pid: u32,
}

fn get_active_window() -> Option<ActivityEvent> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0 == 0 {
            return None;
        }

        // Get window title
        let mut title_buf = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        let window_title = String::from_utf16_lossy(&title_buf[..title_len as usize]);

        // Get process ID
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        // Get process name
        let app_name = get_process_name(pid).unwrap_or_default();

        Some(ActivityEvent {
            timestamp: chrono::Utc::now().to_rfc3339(),
            app_name,
            window_title,
            pid,
        })
    }
}

fn get_process_name(pid: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 512];
        let mut size = buf.len() as u32;
        QueryFullProcessImageNameW(handle, Default::default(), &mut buf, &mut size).ok()?;
        
        let path = String::from_utf16_lossy(&buf[..size as usize]);
        path.split('\\').last().map(|s| s.to_string())
    }
}

fn main() {
    let poll_interval = Duration::from_secs(2);
    let mut last_event: Option<ActivityEvent> = None;

    loop {
        if let Some(event) = get_active_window() {
            // Only emit if changed
            let should_emit = match &last_event {
                None => true,
                Some(last) => {
                    last.app_name != event.app_name || 
                    last.window_title != event.window_title
                }
            };

            if should_emit {
                // Output JSON to stdout (Python reads this)
                println!("{}", serde_json::to_string(&event).unwrap());
                last_event = Some(event);
            }
        }

        thread::sleep(poll_interval);
    }
}
Python side (reads from Rust daemon):
python# alfy/tools/productivity/activity_monitor.py

import subprocess
import json
import asyncio
from pathlib import Path

class ActivityMonitor:
    def __init__(self):
        self.process = None
        self.running = False
    
    async def start(self):
        exe_path = Path("helpers/alfy-activity-monitor.exe")
        
        self.process = await asyncio.create_subprocess_exec(
            str(exe_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        self.running = True
        
        asyncio.create_task(self._read_events())
    
    async def _read_events(self):
        while self.running and self.process:
            line = await self.process.stdout.readline()
            if line:
                event = json.loads(line.decode())
                await self._handle_event(event)
    
    async def _handle_event(self, event: dict):
        # Store in database, check focus session, etc.
        await self.db.log_activity(
            app_name=event["app_name"],
            window_title=event["window_title"],
            timestamp=event["timestamp"]
        )
        
        # Check for distractions during focus
        if self.focus_session_active:
            if self._is_distraction(event["app_name"]):
                await self.send_nudge()
    
    async def stop(self):
        self.running = False
        if self.process:
            self.process.terminate()
```

---

## Example: File Indexer in Rust (PyO3 Extension)

For heavy file scanning, a Rust Python extension is faster than pure Python.
```
alfy-helpers/
└── file-indexer/
    ├── Cargo.toml
    └── src/
        └── lib.rs
toml# Cargo.toml
[package]
name = "alfy_indexer"
version = "0.1.0"
edition = "2021"

[lib]
name = "alfy_indexer"
crate-type = ["cdylib"]

[dependencies]
pyo3 = { version = "0.20", features = ["extension-module"] }
walkdir = "2"
sha2 = "0.10"
rayon = "1.8"
rust// src/lib.rs

use pyo3::prelude::*;
use rayon::prelude::*;
use sha2::{Sha256, Digest};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[pyclass]
struct FileInfo {
    #[pyo3(get)]
    path: String,
    #[pyo3(get)]
    name: String,
    #[pyo3(get)]
    size: u64,
    #[pyo3(get)]
    hash: String,
    #[pyo3(get)]
    extension: String,
}

#[pyfunction]
fn scan_directory(path: String, extensions: Vec<String>) -> PyResult<Vec<FileInfo>> {
    let entries: Vec<_> = WalkDir::new(&path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| {
            if extensions.is_empty() {
                return true;
            }
            e.path()
                .extension()
                .map(|ext| extensions.contains(&ext.to_string_lossy().to_lowercase()))
                .unwrap_or(false)
        })
        .collect();

    let files: Vec<FileInfo> = entries
        .par_iter()  // Parallel iteration
        .filter_map(|entry| {
            let path = entry.path();
            let metadata = fs::metadata(path).ok()?;
            
            Some(FileInfo {
                path: path.to_string_lossy().to_string(),
                name: path.file_name()?.to_string_lossy().to_string(),
                size: metadata.len(),
                hash: compute_hash(path).unwrap_or_default(),
                extension: path.extension()
                    .map(|e| e.to_string_lossy().to_string())
                    .unwrap_or_default(),
            })
        })
        .collect();

    Ok(files)
}

fn compute_hash(path: &Path) -> Option<String> {
    let contents = fs::read(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&contents);
    Some(format!("{:x}", hasher.finalize()))
}

#[pymodule]
fn alfy_indexer(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(scan_directory, m)?)?;
    m.add_class::<FileInfo>()?;
    Ok(())
}
Python usage:
python# alfy/tools/files/indexer.py

import alfy_indexer  # Rust extension

async def index_documents(directory: str):
    # Rust scans files in parallel (10-50x faster than Python)
    files = alfy_indexer.scan_directory(
        directory, 
        extensions=["pdf", "docx", "txt", "md"]
    )
    
    for file in files:
        # Store in SQLite
        await db.upsert_file_index(
            path=file.path,
            name=file.name,
            size=file.size,
            content_hash=file.hash,
            file_type=file.extension
        )
        
        # Extract text (Python, since we need PDF/DOCX libraries)
        content = await extract_text(file.path)
        await db.update_file_content(file.path, content)
```

---

## Updated Project Structure
```
alfy/
├── ui/                      # Tauri + React
│   └── src-tauri/                # ← Rust (Tauri shell)
│
├── backend/                 # Python (FastAPI + LLM)
│
├── alfy-helpers/                 # ← Rust performance helpers
│   ├── activity-monitor/
│   │   ├── Cargo.toml
│   │   └── src/main.rs
│   │
│   ├── file-watcher/
│   │   ├── Cargo.toml
│   │   └── src/main.rs
│   │
│   └── file-indexer/             # PyO3 Python extension
│       ├── Cargo.toml
│       └── src/lib.rs
│
└── scripts/
    └── build-helpers.ps1         # Builds Rust helpers

Summary: Where Rust Lives
ComponentRust RoleRequired?Tauri shellWindow management, tray, hotkeysYes (part of Tauri)Activity monitorLightweight background daemonOptional (can use Python with pywin32)File watcherDirectory change notificationsOptional (can use watchdog in Python)File indexerFast parallel file scanningOptional (speeds up initial index)Embeddings searchVector similarityOptional (can use faiss or numpy)