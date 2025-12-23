# Executor Deadlock Fix - December 9, 2025

## Critical Issue Found: Single Executor Blocking

### Problem
The application was using a **single-threaded executor** for both router and agent models:
```python
self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="llama_")
```

### Why This Caused Deadlock

**Flow:**
1. User sends query "Hello"
2. Router heuristics fail → needs LLM classification
3. Router calls `classify()` → submits to `_executor` (BLOCKS thread)
4. Router takes 11 seconds to classify
5. Agent tries to `generate()` → submits to SAME `_executor` (WAITS for router)
6. Router finishes, releases executor thread
7. Agent starts generation → Times out after 60 seconds

**The problem:** The router was **blocking** the only available executor thread, preventing the agent from running!

### Solution Applied

Created **separate executors** for router and agent:

```python
# BEFORE (BROKEN):
self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="llama_")

# AFTER (FIXED):
self._router_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="llama_router_")
self._agent_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="llama_agent_")
```

Now:
- Router operations run on `_router_executor`
- Agent operations run on `_agent_executor`
- They can run concurrently without blocking each other

### Additional Fix: Router Output Cleaning

The router was returning `'<think>'` instead of a domain name. Added cleanup:

```python
# Clean up thinking tokens and extract domain
if '<' in domain or '>' in domain:
    domain = domain.replace('<think>', '').replace('</think>', '')
    domain = domain.replace('<', '').replace('>', '')
    domain = domain.strip()

# Extract first word if multiple words
if ' ' in domain:
    domain = domain.split()[0]
```

### Files Modified

1. ✅ [backend/alfy/core/llm.py](backend/alfy/core/llm.py)
   - Line 57-58: Created separate executors
   - Line 130: Router loading uses `_router_executor`
   - Line 201: Agent loading uses `_agent_executor`
   - Line 275: Router classify uses `_router_executor`
   - Line 370: Agent generate uses `_agent_executor`
   - Line 442: Agent stream uses `_agent_executor`
   - Line 289-299: Added router output cleaning
   - Line 510-511: Shutdown both executors

### Expected Behavior After Fix

**Before:**
```
[ROUTER] Classified to '<think>' in 11.58s
[AGENT] Acquiring generation lock...
[AGENT] Calling llama.cpp create_chat_completion...
(60 second timeout - FAILS)
```

**After:**
```
[ROUTER] Classified to 'general' in 11.58s  ✅ (cleaned up)
[AGENT] Acquiring generation lock...
[AGENT] Calling llama.cpp create_chat_completion...
[AGENT] LLM call completed successfully  ✅
[AGENT] Generated 156 chars in 3.45s  ✅
```

### Test Now

Restart backend and try:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "model": "local"}'
```

Should respond in 3-5 seconds (not timeout!).

---

**Fix Applied:** December 9, 2025, 17:05
**Root Cause:** Single executor deadlock
**Priority:** CRITICAL
