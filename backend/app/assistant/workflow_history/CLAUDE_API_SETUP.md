# Claude API Integration Guide

This guide explains how to set up and use Claude API (or OpenAI) with Alfy instead of the local LLM.

## Quick Start

### 1. Install Required Dependencies

For Claude API:
```bash
pip install anthropic
```

For OpenAI API:
```bash
pip install openai
```

For both:
```bash
pip install anthropic openai
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

**For Claude API:**
```env
ALFY_LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
ALFY_CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

**For OpenAI API:**
```env
ALFY_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
ALFY_OPENAI_MODEL=gpt-4
```

**For Local LLM (default):**
```env
ALFY_LLM_PROVIDER=local
```

### 3. Get Your API Keys

**Claude (Anthropic):**
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

**OpenAI:**
1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)

### 4. Start Alfy

```bash
cd backend
python -m app.main
```

Alfy will automatically use the configured provider!

## Switching Between Providers

You have two ways to switch between local and cloud LLMs:

### Option 1: Environment Variable (Global)

Change the `ALFY_LLM_PROVIDER` in your `.env` file:

```env
# Use Claude for all queries
ALFY_LLM_PROVIDER=claude

# Use local LLM for all queries
ALFY_LLM_PROVIDER=local

# Use OpenAI for all queries
ALFY_LLM_PROVIDER=openai
```

### Option 2: Per-Query (Dynamic)

Users can explicitly request a specific provider in their queries:

```
User: "Ask Claude to explain quantum computing"
→ Routes to Claude API even if local is default

User: "Ask ChatGPT about Python best practices"
→ Routes to OpenAI API even if local is default
```

The router automatically detects keywords like:
- `claude`, `anthropic` → Routes to Claude
- `gpt`, `chatgpt`, `openai` → Routes to OpenAI
- Otherwise → Uses configured default

## Available Claude Models

| Model | Description | Best For |
|-------|-------------|----------|
| `claude-3-5-sonnet-20241022` | **Recommended** - Best balance of speed and quality | General use |
| `claude-3-7-sonnet-20250219` | Newest Sonnet model | Latest features |
| `claude-opus-4-5-20251101` | Highest quality, most capable | Complex tasks |
| `claude-3-5-haiku-20241022` | Fastest, most cost-effective | Simple queries |

Configure in `.env`:
```env
ALFY_CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

## Configuration Options

### Claude Settings

```env
# Model selection
ALFY_CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Maximum response length (tokens)
ALFY_CLAUDE_MAX_TOKENS=4096

# Creativity level (0.0 = focused, 1.0 = creative)
ALFY_CLAUDE_TEMPERATURE=0.7
```

### Local LLM Settings

```env
# Model files
ALFY_LOCAL_ROUTER_MODEL=llm_models/qwen3-1.7b-q4_k_m.gguf
ALFY_LOCAL_AGENT_MODEL=llm_models/qwen3-8b-q4_k_m.gguf

# Performance tuning
ALFY_LOCAL_N_THREADS=4
ALFY_LOCAL_N_CTX=2048
ALFY_LOCAL_MAX_TOKENS=512
```

## Architecture

### Provider Abstraction

Alfy uses a modular provider system that makes switching seamless:

```
User Query
    ↓
Router (detects domain)
    ↓
Agent (handles query)
    ↓
LLM Provider Factory
    ↓
┌─────────────┬──────────────┬──────────────┐
│ Local LLM   │ Claude API   │ OpenAI API   │
│ Provider    │ Provider     │ Provider     │
└─────────────┴──────────────┴──────────────┘
```

All providers implement the same interface:
- `generate(prompt, system_prompt, max_tokens, temperature) → str`
- `generate_stream(prompt, ...) → AsyncIterator[str]`
- `cleanup()`

### Code Structure

```
backend/app/
├── config.py                  # Central configuration
├── core/
│   └── llm_provider.py       # Provider abstraction layer
├── services/
│   └── external_llm.py       # Claude/OpenAI API integration
└── agents/
    └── external_llm.py       # Agent for external LLM delegation
```

## Cost Considerations

### Claude API Pricing (as of 2024)

**Claude 3.5 Sonnet:**
- Input: $3 per million tokens (~$0.003 per 1K tokens)
- Output: $15 per million tokens (~$0.015 per 1K tokens)

**Claude Opus 4.5:**
- Input: $15 per million tokens
- Output: $75 per million tokens

**Claude 3.5 Haiku:**
- Input: $0.80 per million tokens
- Output: $4 per million tokens

### Local LLM Costs

- **Free** (no API costs)
- One-time model download (~5-10 GB)
- Uses your computer's CPU/GPU
- ~6-10 GB RAM usage during inference

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"

Make sure you:
1. Created a `.env` file (copied from `.env.example`)
2. Set `ANTHROPIC_API_KEY=sk-ant-...` with your actual key
3. Restarted the Alfy server after changing `.env`

### "anthropic package not installed"

Install the SDK:
```bash
pip install anthropic
```

### "Claude API not configured" error in responses

This happens when:
- Router detects "claude" in query
- But `ALFY_LLM_PROVIDER` is set to `local`
- And no `ANTHROPIC_API_KEY` is configured

**Solution:** Either set up Claude API keys or use queries without "claude" keyword.

### Local models not loading

If you want to use local LLM, make sure:
1. Models are downloaded to `llm_models/` directory
2. Paths in `.env` match actual model files
3. You have enough RAM (~10 GB free)

## Examples

### Using Claude for specific queries

```python
# In your Alfy chat:
User: "Ask Claude to write a Python function to sort a list"
Alfy: [Routes to Claude API, returns response]

User: "What's the weather?"
Alfy: [Uses default provider from config]
```

### Configuration-based switching

**.env with Claude default:**
```env
ALFY_LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

All queries use Claude unless local is explicitly requested.

**.env with local default:**
```env
ALFY_LLM_PROVIDER=local
```

All queries use local LLM unless Claude/GPT is explicitly requested.

## API Response Validation

The integration includes:
- Automatic retry logic for transient errors
- Graceful fallback messages for configuration issues
- Token counting and logging
- Streaming support for real-time responses

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore` by default
2. **Use environment variables** - Don't hardcode API keys
3. **Rotate keys regularly** - Generate new keys periodically
4. **Monitor usage** - Check your Anthropic/OpenAI dashboard for costs
5. **Set spending limits** - Configure budget alerts in provider console

## Next Steps

- Configure your preferred provider in `.env`
- Start Alfy and test with a simple query
- Monitor response quality and latency
- Adjust temperature and max_tokens as needed
- Consider using Haiku for simple queries to save costs

## Support

For issues or questions:
- Check the main [README.md](README.md)
- Review [TECH_STACK.md](TECH_STACK.md) for architecture details
- Open an issue on GitHub
