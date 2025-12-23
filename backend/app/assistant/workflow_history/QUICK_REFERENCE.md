# Alfy LLM Provider - Quick Reference

## Configuration Cheat Sheet

### Switch to Claude API

```env
# .env file
ALFY_LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
ALFY_CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Switch to OpenAI API

```env
# .env file
ALFY_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
ALFY_OPENAI_MODEL=gpt-4
```

### Switch to Local LLM

```env
# .env file
ALFY_LLM_PROVIDER=local
```

## Code Examples

### Basic Usage

```python
from app.core.llm_provider import LLMProviderFactory

# Get provider
provider = await LLMProviderFactory.get_provider()

# Generate response
response = await provider.generate(
    prompt="Your question here",
    system_prompt="You are a helpful assistant",
    max_tokens=500,
    temperature=0.7
)
```

### Streaming

```python
async for chunk in provider.generate_stream(prompt="Hello"):
    print(chunk, end="", flush=True)
```

### Force Specific Provider

```python
from app.config import LLMProvider

# Force Claude
provider = await LLMProviderFactory.get_provider(LLMProvider.CLAUDE)

# Force local
provider = await LLMProviderFactory.get_provider(LLMProvider.LOCAL)
```

### Cleanup

```python
await provider.cleanup()
# or
await LLMProviderFactory.cleanup()
```

## Testing

```bash
# Check configuration
python -m app.examples.test_claude_integration --check-config

# Test Claude
python -m app.examples.test_claude_integration --provider claude

# Test all providers
python -m app.examples.test_claude_integration --provider all

# Run example scripts
python -m app.examples.simple_usage
```

## File Locations

| File | Purpose |
|------|---------|
| `.env` | Your configuration (create from `.env.example`) |
| `backend/app/config.py` | Configuration system |
| `backend/app/core/llm_provider.py` | Provider abstraction |
| `backend/app/services/external_llm.py` | Claude/OpenAI API calls |
| `backend/app/agents/external_llm.py` | External LLM agent |

## Common Commands

```bash
# Install dependencies
pip install anthropic openai

# Create config file
cp .env.example .env

# Edit config
nano .env  # or use any text editor

# Test integration
python -m app.examples.test_claude_integration --check-config

# Run server
cd backend
python -m app.main
```

## Provider Comparison

| Feature | Local | Claude | OpenAI |
|---------|-------|--------|--------|
| **Cost** | Free | $3-15/M tokens | $10-60/M tokens |
| **Speed** | 1-5s | 0.5-2s | 0.5-2s |
| **Privacy** | 100% local | Cloud | Cloud |
| **RAM** | ~8GB | Minimal | Minimal |
| **Internet** | No | Yes | Yes |
| **Quality** | Good | Excellent | Excellent |

## Environment Variables Reference

### Provider Selection
```env
ALFY_LLM_PROVIDER=local|claude|openai
```

### Claude Settings
```env
ANTHROPIC_API_KEY=sk-ant-...
ALFY_CLAUDE_MODEL=claude-3-5-sonnet-20241022
ALFY_CLAUDE_MAX_TOKENS=4096
ALFY_CLAUDE_TEMPERATURE=0.7
```

### OpenAI Settings
```env
OPENAI_API_KEY=sk-...
ALFY_OPENAI_MODEL=gpt-4
```

### Local LLM Settings
```env
ALFY_LOCAL_ROUTER_MODEL=llm_models/qwen3-1.7b-q4_k_m.gguf
ALFY_LOCAL_AGENT_MODEL=llm_models/qwen3-8b-q4_k_m.gguf
ALFY_LOCAL_MAX_TOKENS=512
ALFY_LOCAL_TEMPERATURE=0.7
```

## Troubleshooting Quick Fixes

### "API key not configured"
```bash
# Add to .env file
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env
```

### "Package not installed"
```bash
pip install anthropic openai
```

### "Model not found"
```bash
# Check model path exists
ls -la llm_models/

# Download models
python backend/app/download_models.py
```

### "Provider initialization failed"
```bash
# Check configuration
python -m app.examples.test_claude_integration --check-config
```

## API Endpoints (if using example main.py)

```bash
# Chat
POST /chat
{
  "message": "Hello!",
  "conversation_id": "optional-id"
}

# Switch provider at runtime
POST /switch-provider
{
  "provider": "claude"
}

# Check status
GET /status
```

## Claude Models Guide

| Model | Code | Use Case |
|-------|------|----------|
| Sonnet 3.5 | `claude-3-5-sonnet-20241022` | **Recommended** - Best balance |
| Sonnet 3.7 | `claude-3-7-sonnet-20250219` | Newest Sonnet |
| Opus 4.5 | `claude-opus-4-5-20251101` | Highest quality |
| Haiku 3.5 | `claude-3-5-haiku-20241022` | Fastest/cheapest |

## Quick Decision Tree

```
Need to choose a provider?
│
├─ Privacy critical? → Use LOCAL
│
├─ Limited budget? → Use LOCAL or Haiku
│
├─ Best quality? → Use Claude Opus
│
├─ Good balance? → Use Claude Sonnet
│
└─ Already have OpenAI? → Use OpenAI
```

## Getting API Keys

**Claude:**
1. Go to https://console.anthropic.com/
2. Sign up/Login
3. Navigate to API Keys
4. Create key

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Sign up/Login
3. Create new secret key
4. Copy key

## Documentation Links

- [Full Setup Guide](CLAUDE_API_SETUP.md)
- [Integration Summary](CLAUDE_INTEGRATION_SUMMARY.md)
- [Main README](README.md)
- [Tech Stack](TECH_STACK.md)

## Support

For issues:
1. Check [CLAUDE_API_SETUP.md](CLAUDE_API_SETUP.md) troubleshooting section
2. Run `python -m app.examples.test_claude_integration --check-config`
3. Check logs in `backend/logs/`
4. Open GitHub issue with error details
