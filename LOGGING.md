# Focus App Logging System

This document describes the logging system implemented in the Focus desktop application. The logging system helps track application lifecycle events, errors, and operations for troubleshooting and debugging in production.

## Overview

The Focus app uses a dual logging system:
- **Backend (Python/FastAPI)**: Structured JSON logging with file rotation
- **Frontend (Electron/TypeScript)**: Application event logging with file rotation

Both systems write logs to persistent files that survive app restarts, making it easy to diagnose issues after installation or during runtime.

## Backend Logging

### Location

**Development:**
- Log file: `./backend/logs/focus.log`

**Production (Packaged App):**
- Windows: `%LOCALAPPDATA%\Focus\logs\focus.log`
- macOS: `~/Library/Application Support/Focus/logs/focus.log`
- Linux: `~/.local/share/Focus/logs/focus.log`

### Configuration

Backend logging is configured in `backend/app/core/config.py`:

```python
class LoggingSettings(BaseSettings):
    level: str = "WARNING"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    format: str = "json"    # json or text
    output: str = "console" # console, file, or both
    file_path: str = "./logs/focus.log"
    file_rotation: bool = True
    file_max_size_mb: int = 10
    file_backup_count: int = 5
```

You can override these settings using environment variables:
- `LOG_LEVEL=INFO`
- `LOG_FORMAT=text`
- `LOG_OUTPUT=both`

### Usage

The backend uses two logging systems:

#### 1. Standard Logging (app/core/logging.py)

```python
from app.core.logging import get_logger

logger = get_logger(__name__)
logger.info("Something happened")
logger.error("Error occurred", exc_info=True)
```

#### 2. Application Logger (app/utils/app_logger.py)

For tracking specific application events:

```python
from app.utils.app_logger import get_app_logger

app_logger = get_app_logger("component_name")

# Log startup
app_logger.log_startup(host="127.0.0.1", port=8000)

# Log database operations
app_logger.log_database_init("success", database_path="/path/to/db")

# Log space operations
app_logger.log_space_operation(
    "create",
    space_id="123",
    space_name="My Space",
    status="success"
)

# Log object operations (links, files, etc)
app_logger.log_object_operation(
    "create",
    object_id="456",
    object_type="link",
    status="success",
    title="Example Link"
)

# Log storage operations
app_logger.log_storage_operation(
    "ensure_directories",
    status="success"
)

# Log errors
app_logger.log_error(
    "database_error",
    "Failed to connect",
    exc_info=True,
    additional_context="value"
)
```

### Log Format

Logs are written in JSON format by default:

```json
{
  "timestamp": "2024-01-08T12:34:56.789Z",
  "level": "INFO",
  "logger": "app.spaces",
  "message": "Space create success: My Space",
  "event": "space_operation",
  "operation": "create",
  "status": "success",
  "space_id": "abc-123",
  "space_name": "My Space",
  "file": "spaces.py",
  "function": "create_space",
  "line": 132
}
```

## Frontend Logging

### Location

**All Environments:**
- Log file: `{userData}/logs/focus-app.log`
- Windows: `%APPDATA%\Focus\logs\focus-app.log`
- macOS: `~/Library/Application Support/Focus/logs/focus-app.log`
- Linux: `~/.config/Focus/logs/focus-app.log`

To find the exact path, you can check the Electron userData directory:
```javascript
app.getPath('userData')
```

### Usage

The frontend logger is located in `ui/src/utils/logger.ts`:

```typescript
import {
  logStartup,
  logBackendStart,
  logBackendError,
  logWindowCreation,
  logError,
  logInfo,
  logWarning
} from './utils/logger';

// Log app startup
logStartup({ customData: 'value' });

// Log backend operations
logBackendStart('success', { backendPath: '/path/to/backend' });
logBackendError('Backend crashed', error, { exitCode: 1 });

// Log window operations
logWindowCreation('success');

// Log errors
logError('initialization_error', 'Failed to load config', error);

// Log general events
logInfo('config_loaded', 'Configuration loaded successfully', { configPath: '/path' });
logWarning('Deprecated feature used', { feature: 'oldApi' });
```

### Log Format

Frontend logs use a structured text format:

```
[2024-01-08T12:34:56.789Z] [INFO] [app_startup] Application starting {"data":{"appVersion":"1.0.0","electronVersion":"28.0.0","platform":"win32","isPackaged":true}}
[2024-01-08T12:34:57.123Z] [INFO] [backend_start] Backend start started {"data":{"backendPath":"C:\\path\\to\\Focus.exe"}}
[2024-01-08T12:35:00.456Z] [INFO] [window_creation] Window creation success
```

### Log Rotation

The frontend logger automatically rotates log files when they exceed 10MB:
- Current log: `focus-app.log`
- Backup log: `focus-app.log.old`

Old backups are deleted when creating a new backup.

## Logged Events

### Backend Events

1. **Startup/Lifecycle**
   - App startup with environment info
   - Database initialization (started, success, failed)
   - Storage directory creation
   - Shutdown events

2. **Space Operations**
   - Create space (success/failed)
   - Update space (success/failed)
   - Delete space (success/failed)
   - List spaces

3. **Object Operations**
   - Create object/link (success/failed)
   - Update object (success/failed)
   - Delete object (success/failed)
   - File uploads

4. **Storage Operations**
   - Directory creation
   - File operations
   - Cache operations

5. **Errors**
   - All uncaught exceptions
   - Database errors
   - API errors
   - Validation errors

### Frontend Events

1. **Startup**
   - App startup with version info
   - Electron version and platform

2. **Backend Management**
   - Backend process start
   - Backend exit (with exit code)
   - Backend errors

3. **Window Operations**
   - Window creation
   - Window load success/failure
   - Renderer errors

4. **Errors**
   - Uncaught exceptions
   - IPC errors
   - File system errors

## Accessing Logs

### During Development

**Backend logs:**
```bash
# View live logs
tail -f backend/logs/focus.log

# View with formatting (if using JSON logs)
tail -f backend/logs/focus.log | jq
```

**Frontend logs:**
```bash
# Find the logs directory
# On Windows (PowerShell):
ls $env:APPDATA\Focus\logs\

# On macOS/Linux:
ls ~/Library/Application\ Support/Focus/logs/
```

### In Production

After releasing the app, logs are in the user data directory. You can:

1. Add a menu item to open the logs folder:
```typescript
shell.openPath(path.join(app.getPath('userData'), 'logs'));
```

2. Or add it to the help menu for users to access

3. For support, ask users to share the log files from:
   - Windows: `%APPDATA%\Focus\logs\`
   - macOS: `~/Library/Application Support/Focus/logs/`
   - Linux: `~/.config/Focus/logs/`

## Troubleshooting

### Common Log Patterns

**Database Initialization Failed:**
```json
{
  "event": "database_init",
  "status": "failed",
  "error": "unable to open database file"
}
```
→ Check file permissions in the user data directory

**Backend Start Failed:**
```
[ERROR] [backend_error] Backend binary not found {"data":{"backendPath":"..."}}
```
→ Backend executable missing from package

**Space Creation Failed:**
```json
{
  "event": "space_operation",
  "operation": "create",
  "status": "failed",
  "error": "database is locked"
}
```
→ Database locked by another process

### Log Level Guidelines

- **DEBUG**: Detailed information for debugging (not in production)
- **INFO**: General informational events (default for important operations)
- **WARNING**: Warning messages (non-critical issues)
- **ERROR**: Error events that need attention
- **CRITICAL**: Critical errors that may cause app failure

### Performance Considerations

- Logs are written asynchronously to avoid blocking operations
- File rotation prevents logs from growing indefinitely
- JSON format allows efficient parsing and analysis
- Structured logging makes it easy to filter and search

## Best Practices

1. **Always log critical operations:**
   - Database initialization
   - Space/Object creation
   - File operations
   - Authentication flows

2. **Include context:**
   - IDs (space_id, object_id)
   - Status (success/failed)
   - Error messages
   - Relevant metadata

3. **Don't log sensitive data:**
   - Passwords or tokens
   - Personal information
   - File contents
   - API keys

4. **Use appropriate log levels:**
   - INFO for successful operations
   - WARNING for recoverable issues
   - ERROR for failures

5. **Make logs actionable:**
   - Include enough context to diagnose issues
   - Log both success and failure cases
   - Add error codes for common failures

## Future Enhancements

Potential improvements to the logging system:

1. **Log aggregation**: Send logs to a remote service for analysis
2. **User feedback**: Allow users to submit logs with bug reports
3. **Log viewer**: Built-in UI to view and filter logs
4. **Metrics**: Track performance metrics and usage statistics
5. **Alerts**: Notify on critical errors or patterns
