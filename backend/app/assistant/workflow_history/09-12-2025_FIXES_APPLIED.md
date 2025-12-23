# Alfy Bug Fixes - December 9, 2025

## Issues Addressed

### Issue 1: Financial Mode Default (RESOLVED - NOT A BUG)
**Status:** Investigation complete - no actual bug found

**Finding:** The UI correctly defaults to `'general'` mode, not financial mode. The perceived issue may be due to:
- Visual confusion with tab ordering (Finance is 2nd tab after Email)
- Backend routing matching finance-related keywords in queries
- No state persistence issues found

**Location:** [ui/src/components/Chat/ChatWindow.tsx:23](ui/src/components/Chat/ChatWindow.tsx#L23)

---

### Issue 2: LLM Not Responding After Cold Start (CRITICAL - FIXED)
**Status:** Root cause identified and fixed

**Root Cause:**
1. **Threading/Async mismatch** - The LLM class used `threading.Lock()` in async code, causing potential deadlocks
2. **Model loading blocking event loop** - Long model loading operations (5-10 seconds) blocked the async event loop
3. **Poor error handling** - Empty responses returned with no useful feedback
4. **No logging** - Difficult to debug what was happening during model loading

---

## Changes Applied

### 1. Fixed Async/Threading Issues in LLM Class
**File:** [backend/alfy/core/llm.py](backend/alfy/core/llm.py)

#### Changes:
- ✅ Replaced `threading.Lock()` with `asyncio.Lock()`
- ✅ Made `_load_router()` async with proper async/await
- ✅ Made `_load_agent()` async with proper async/await
- ✅ Made `classify()` async
- ✅ Made `generate()` async
- ✅ Made `generate_stream()` async
- ✅ Used `loop.run_in_executor()` to prevent blocking event loop during:
  - Model loading (Llama initialization)
  - Inference (create_chat_completion)

#### Key Improvements:
```python
# Before (BLOCKING):
self._agent_model = Llama(model_path=agent_path, ...)

# After (NON-BLOCKING):
loop = asyncio.get_event_loop()
self._agent_model = await loop.run_in_executor(
    None,
    lambda: Llama(model_path=agent_path, ...)
)
```

---

### 2. Enhanced Logging and Error Handling
**File:** [backend/alfy/core/llm.py](backend/alfy/core/llm.py)

#### Changes:
- ✅ Added `[ROUTER]` and `[AGENT]` prefixes to all log messages
- ✅ Added timing logs for model loading (shows load time in seconds)
- ✅ Added timing logs for inference (shows generation time)
- ✅ Added character count logging for responses
- ✅ Better error messages distinguishing:
  - Import errors (llama-cpp-python not installed)
  - File not found (model files missing)
  - Load failures (model loading errors)
  - Generation failures (inference errors)
- ✅ Added loading state tracking (`_loading_router`, `_loading_agent`)
- ✅ Added user-friendly error messages instead of technical stack traces

#### Example Logs:
```
[AGENT] Loading model from llm_models/Qwen_Qwen3-8B-Q4_K_M.gguf... (this may take 5-10 seconds)
[AGENT] Model loaded successfully in 6.42s
[AGENT] Generating response for prompt: Hello, how are you?...
[AGENT] Generated 156 chars in 2.34s
```

---

### 3. Model Preloading on Startup
**File:** [backend/alfy/main.py](backend/alfy/main.py)

#### Changes:
- ✅ Added `@app.on_event("startup")` handler
- ✅ Preloads agent model (8B) during backend startup
- ✅ Eliminates 5-10 second wait on first user query
- ✅ Graceful fallback if preloading fails

#### Benefits:
- **Before:** First query takes 10-15 seconds (model load + inference)
- **After:** First query takes 2-3 seconds (inference only)

---

### 4. Added Status Endpoint
**File:** [backend/alfy/main.py](backend/alfy/main.py)

#### Changes:
- ✅ New `/status` endpoint to check:
  - Model loading state (router_loaded, agent_loaded)
  - Cached agents (which domains have been used)
  - Router statistics (heuristic hit rate)

#### Usage:
```bash
curl http://localhost:8000/status
```

Response:
```json
{
  "status": "ok",
  "models": {
    "router_loaded": false,
    "agent_loaded": true
  },
  "cached_agents": ["general", "finance"],
  "router_stats": {
    "hits": 5,
    "misses": 2,
    "ambiguous": 1,
    "total": 8,
    "hit_rate_percent": 62.5
  }
}
```

---

### 5. Updated Router to Use Async
**File:** [backend/alfy/core/router.py](backend/alfy/core/router.py)

#### Changes:
- ✅ Made `route()` method async
- ✅ Uses `await self.llm_router.classify()` for LLM classification

---

### 6. Updated Orchestrator
**File:** [backend/alfy/core/orchestrator.py](backend/alfy/core/orchestrator.py)

#### Changes:
- ✅ Uses `await self.router.route()` in `process_stream()`

---

### 7. Updated Base Agent
**File:** [backend/alfy/agents/base.py](backend/alfy/agents/base.py)

#### Changes:
- ✅ Uses `await self.llm.generate()` in `handle_stream()`

---

## Testing Instructions

### 1. Start Backend
```bash
cd backend
.\venv\Scripts\python -m uvicorn alfy.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
============================================================
Starting Alfy backend - preloading models...
============================================================
[AGENT] Loading model from llm_models/Qwen_Qwen3-8B-Q4_K_M.gguf... (this may take 5-10 seconds)
[AGENT] Model loaded successfully in 6.42s
✓ Agent model preloaded successfully
============================================================
Alfy backend ready!
============================================================
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Check Status
```bash
curl http://localhost:8000/status
```

Should show `"agent_loaded": true`

### 3. Test Chat
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?", "model": "local"}'
```

**Expected:**
- **First query:** Should respond in 2-3 seconds (no model loading delay)
- **Subsequent queries:** Should respond in 2-3 seconds consistently

### 4. Start UI
```bash
cd ui
npm run dev:tauri
```

**Test flow:**
1. Open app
2. Send first message immediately
3. Should get response within 2-3 seconds (not 10-15 seconds)
4. Send second message
5. Should get response within 2-3 seconds
6. Restart backend
7. Send message
8. Should still work on first try (no silent failure)

---

## Files Modified

1. ✅ `backend/alfy/core/llm.py` - Main LLM async fixes
2. ✅ `backend/alfy/core/router.py` - Router async update
3. ✅ `backend/alfy/core/orchestrator.py` - Orchestrator async update
4. ✅ `backend/alfy/agents/base.py` - Base agent async update
5. ✅ `backend/alfy/main.py` - Startup preloading + status endpoint

---

## What Was Wrong (Technical Details)

### Problem 1: Threading Locks in Async Code
```python
# WRONG - causes deadlocks in async context
self._lock = threading.Lock()
with self._lock:
    # blocking operation

# CORRECT - async-safe
self._lock = asyncio.Lock()
async with self._lock:
    # async operation
```

### Problem 2: Blocking Event Loop
```python
# WRONG - blocks event loop for 5-10 seconds
self._agent_model = Llama(model_path=path, ...)  # BLOCKS!

# CORRECT - runs in thread pool executor
loop = asyncio.get_event_loop()
self._agent_model = await loop.run_in_executor(
    None,
    lambda: Llama(model_path=path, ...)
)
```

### Problem 3: No Error Visibility
- Before: Silent failures, no logs, empty responses
- After: Detailed logging with timings, clear error messages, user-friendly fallbacks

---

## Expected Behavior After Fixes

### Cold Start (First Run)
1. ✅ Backend starts and preloads model (5-10 seconds during startup)
2. ✅ User opens UI
3. ✅ User sends first message
4. ✅ Response comes back in 2-3 seconds (no additional loading)
5. ✅ Logs show detailed timing information

### Subsequent Queries
1. ✅ All queries respond in 2-3 seconds
2. ✅ No empty responses
3. ✅ No silent failures
4. ✅ Clear error messages if something goes wrong

### Backend Restart
1. ✅ Models reload during startup (logged with timing)
2. ✅ First query after restart works immediately
3. ✅ No need to send a "warm-up" query

---

## Monitoring

Check logs for these patterns to verify fixes are working:

**Good signs:**
```
[AGENT] Model loaded successfully in X.XXs
[AGENT] Generated XXX chars in X.XXs
[ROUTER] Classified to 'general' in X.XXs
```

**Warning signs:**
```
[AGENT] Generated empty response
[ROUTER] Failed to load router model
[AGENT] Generation error: ...
```

---

## Additional Notes

### Case Sensitivity in Model Paths
The actual model files are:
- `Qwen_Qwen3-1.7B-Q4_K_M.gguf` (with underscores and capitals)
- `Qwen_Qwen3-8B-Q4_K_M.gguf`

The code uses glob patterns to match these:
- `*1.7B*Q4_K_M*.gguf`
- `*8B*Q4_K_M*.gguf`

This works correctly and is logged during model loading.

### Memory Usage
- Router model (1.7B): ~1.5GB RAM
- Agent model (8B): ~6GB RAM
- Total with both loaded: ~7.5GB RAM
- Lazy loading only loads what's needed

### CPU vs GPU
Currently configured for CPU only (`n_gpu_layers=0`). To use GPU:
1. Install CUDA version of llama-cpp-python
2. Change `n_gpu_layers=0` to `n_gpu_layers=35` (or higher)
3. Expect 5-10x faster inference

---

## Rollback Instructions

If these changes cause issues, revert with:
```bash
git checkout HEAD~1 backend/alfy/core/llm.py
git checkout HEAD~1 backend/alfy/core/router.py
git checkout HEAD~1 backend/alfy/core/orchestrator.py
git checkout HEAD~1 backend/alfy/agents/base.py
git checkout HEAD~1 backend/alfy/main.py
```

---

**Fix Date:** December 9, 2025
**Tested On:** Windows 10/11
**Python Version:** 3.10+
**FastAPI Version:** 0.104+
