# Claude API Integration - Summary

## What Was Added

I've successfully added modular Claude API support to Alfy, making it easy to switch between local LLM and cloud-based providers (Claude/OpenAI).

## Files Created/Modified

### New Files

1. **[.env.example](.env.example)** - Environment variable template
   - Configuration options for all providers
   - API key setup instructions
   - Model selection options

2. **[CLAUDE_API_SETUP.md](CLAUDE_API_SETUP.md)** - Complete setup guide
   - Quick start instructions
   - Provider switching guide
   - Model selection and configuration
   - Cost considerations
   - Troubleshooting

3. **[backend/app/core/llm_provider.py](backend/app/core/llm_provider.py)** - Provider abstraction layer
   - `BaseLLMProvider` - Abstract interface
   - `LocalLLMProvider` - Wraps existing local LLM
   - `ClaudeLLMProvider` - Claude API integration
   - `OpenAILLMProvider` - OpenAI API integration
   - `LLMProviderFactory` - Factory for creating/managing providers

4. **[backend/app/examples/test_claude_integration.py](backend/app/examples/test_claude_integration.py)** - Test script
   - Tests individual providers
   - Tests provider switching
   - Configuration checker

5. **[backend/app/examples/main_with_provider.py](backend/app/examples/main_with_provider.py)** - Example main.py
   - Shows how to integrate provider factory
   - Runtime provider switching endpoint
   - Full working example

### Modified Files

1. **[backend/app/config.py](backend/app/config.py)** - Enhanced configuration
   - `LLMProvider` enum (local, claude, openai)
   - `ClaudeModel` enum (all Claude models)
   - Environment variable support for all settings
   - Configuration validation

2. **[backend/app/services/external_llm.py](backend/app/services/external_llm.py)** - Full implementation
   - Lazy-loading Anthropic/OpenAI clients
   - Non-streaming generation
   - Streaming generation
   - Error handling and logging

3. **[backend/app/agents/external_llm.py](backend/app/agents/external_llm.py)** - Agent implementation
   - Uses ExternalLLMService
   - Auto-detects provider from query
   - Handles conversation context
   - Comprehensive error handling

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────┐
│              User Request                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         LLMProviderFactory                      │
│  (Manages provider instances)                   │
└────────────────┬────────────────────────────────┘
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Local   │ │  Claude  │ │  OpenAI  │
│ Provider │ │ Provider │ │ Provider │
└──────────┘ └──────────┘ └──────────┘
      │          │          │
      ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│llama-cpp │ │Anthropic │ │  OpenAI  │
│  (local) │ │   API    │ │   API    │
└──────────┘ └──────────┘ └──────────┘
```

### Provider Abstraction

All providers implement the same interface:

```python
class BaseLLMProvider:
    async def generate(prompt, system_prompt, max_tokens, temperature) -> str
    async def generate_stream(prompt, ...) -> AsyncIterator[str]
    async def cleanup()
```

This makes switching completely transparent to the rest of the application.

### Configuration

Three ways to control which provider is used:

1. **Environment Variable (Global)**
   ```env
   ALFY_LLM_PROVIDER=claude
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Runtime API Call**
   ```bash
   POST /switch-provider
   {"provider": "claude"}
   ```

3. **Query Keywords (Auto-detection)**
   ```
   "Ask Claude to explain X"  → Routes to Claude
   "Use GPT to analyze Y"      → Routes to OpenAI
   "What is Z?"                → Uses default provider
   ```

## Quick Start

### 1. Install Dependencies

```bash
pip install anthropic  # For Claude
pip install openai     # For OpenAI
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
ALFY_LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
ALFY_CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### 3. Test Integration

```bash
# Check configuration
python -m app.examples.test_claude_integration --check-config

# Test Claude provider
python -m app.examples.test_claude_integration --provider claude

# Test all available providers
python -m app.examples.test_claude_integration --provider all
```

### 4. Use in Your Code

**Option A: Use existing main.py with agent routing**
```python
# User queries with "claude" keyword automatically route to Claude
# No code changes needed!
```

**Option B: Use provider factory directly**
```python
from app.core.llm_provider import LLMProviderFactory

# Get configured provider
provider = await LLMProviderFactory.get_provider()

# Generate response
response = await provider.generate(
    prompt="Your prompt here",
    system_prompt="You are a helpful assistant"
)
```

**Option C: Use the example main.py**
```bash
# Copy the example to replace main.py
cp backend/app/examples/main_with_provider.py backend/app/main.py
```

## Available Models

### Claude Models

- `claude-3-5-sonnet-20241022` - **Recommended** (best balance)
- `claude-3-7-sonnet-20250219` - Newest Sonnet
- `claude-opus-4-5-20251101` - Highest quality
- `claude-3-5-haiku-20241022` - Fastest, cheapest

### Configuration

```env
ALFY_CLAUDE_MODEL=claude-3-5-sonnet-20241022
ALFY_CLAUDE_MAX_TOKENS=4096
ALFY_CLAUDE_TEMPERATURE=0.7
```

## Features

### ✅ Implemented

- [x] Configuration system with environment variables
- [x] Provider abstraction layer (local, Claude, OpenAI)
- [x] Full Claude API integration with streaming
- [x] Full OpenAI API integration with streaming
- [x] Lazy-loading API clients
- [x] Runtime provider switching
- [x] Auto-detection from query keywords
- [x] Comprehensive error handling
- [x] Logging and monitoring
- [x] Test scripts and examples
- [x] Documentation and setup guide

### 🎯 Key Benefits

1. **Zero Code Changes** - Switch providers via environment variables
2. **Modular Design** - Easy to add new providers
3. **Backward Compatible** - Local LLM still works exactly as before
4. **Cost Effective** - Use cheap local LLM for simple queries, Claude for complex ones
5. **Production Ready** - Error handling, validation, logging all included

## Example Usage

### Basic Chat

```python
from app.core.llm_provider import LLMProviderFactory

# Get provider (respects ALFY_LLM_PROVIDER env var)
provider = await LLMProviderFactory.get_provider()

# Generate response
response = await provider.generate(
    prompt="Explain quantum computing in simple terms",
    system_prompt="You are a helpful science educator",
    max_tokens=500,
    temperature=0.7
)

print(response)
```

### Streaming Response

```python
# Stream response token by token
async for chunk in provider.generate_stream(
    prompt="Write a short story about a robot",
    max_tokens=1000
):
    print(chunk, end="", flush=True)
```

### Switch Providers

```python
from app.config import LLMProvider

# Switch to Claude
provider = await LLMProviderFactory.get_provider(LLMProvider.CLAUDE)

# Switch to local
provider = await LLMProviderFactory.get_provider(LLMProvider.LOCAL)
```

## Cost Comparison

### Local LLM
- **Cost**: Free (after one-time model download)
- **Latency**: ~1-5 seconds per response
- **Privacy**: 100% local, no data sent anywhere
- **Resource**: ~6-10 GB RAM

### Claude API
- **Cost**: ~$3-15 per 1M input tokens
- **Latency**: ~500ms - 2s per response
- **Privacy**: Data sent to Anthropic
- **Resource**: Minimal local resources

## Security

- API keys stored in `.env` (gitignored)
- Environment variable support
- No hardcoded credentials
- Validation on startup

## Testing

```bash
# Check what's configured
python -m app.examples.test_claude_integration --check-config

# Test specific provider
python -m app.examples.test_claude_integration --provider claude

# Test all available providers
python -m app.examples.test_claude_integration --provider all
```

## Troubleshooting

See [CLAUDE_API_SETUP.md](CLAUDE_API_SETUP.md) for detailed troubleshooting guide.

Common issues:
- "API key not configured" → Set `ANTHROPIC_API_KEY` in `.env`
- "anthropic package not installed" → Run `pip install anthropic`
- "Model not found" → Check `ALFY_CLAUDE_MODEL` is valid

## Next Steps

1. Copy `.env.example` to `.env` and configure your API keys
2. Run the test script to verify everything works
3. Start using Alfy with your preferred provider!

For detailed setup instructions, see [CLAUDE_API_SETUP.md](CLAUDE_API_SETUP.md).
