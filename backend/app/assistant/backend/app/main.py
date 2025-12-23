"""
FastAPI application with direct chat and conversation history.

Uses configurable LLM provider (local Qwen or Claude API) via provider abstraction.
"""

import logging
import psutil
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.llm_provider import LLMProviderFactory
from app.config import settings
from app.storage.conversation_store import ConversationStore
from app.models.conversation import Conversation
from app.utils.text_processing import clean_llm_response
from app.tools.tool_definitions import get_all_tools
from app.tools.tool_executor import tool_executor
from app.api.routes import upload, gdrive_auth, email
from app.core.token_tracker import token_tracker

app = FastAPI(title="Alfy")

# Initialize services
llm_provider = None  # Will be initialized on startup
conv_store = ConversationStore()

# Configure logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Create session-specific log filename with timestamp
session_timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M")
log_filename = log_dir / f"alfy_{session_timestamp}.log"

# Write session header to log file FIRST (before logging is configured)
def write_log_header():
    """Write session configuration header to log file."""
    cpu_count = psutil.cpu_count(logical=True)
    cpu_freq = psutil.cpu_freq()
    mem = psutil.virtual_memory()

    # Build provider-specific configuration
    provider_config = ""
    if settings.llm_provider.value == "claude":
        provider_config = f"""
LLM PROVIDER: Claude API
  Model: {settings.claude_model.value}
  Max Tokens: {settings.claude_max_tokens}
  Temperature: {settings.claude_temperature}
  API Key: {settings.anthropic_api_key[:20]}... (configured)
"""
    elif settings.llm_provider.value == "openai":
        provider_config = f"""
LLM PROVIDER: OpenAI API
  Model: {settings.openai_model}
  API Key: {settings.openai_api_key[:20]}... (configured)
"""
    elif settings.llm_provider.value == "local":
        provider_config = f"""
LLM PROVIDER: Local (Qwen)
  Router Model: {settings.local_router_model_path}
  Agent Model: {settings.local_agent_model_path}
  Context Window: {settings.local_n_ctx}
  Threads: {settings.local_n_threads}
  Max Tokens: {settings.local_max_tokens}
  Temperature: {settings.local_temperature}
"""

    header = f"""{'='*80}
ALFY SESSION LOG
Session started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*80}
{provider_config}
SYSTEM RESOURCES:
  CPU Cores: {cpu_count} logical cores
  CPU Frequency: {cpu_freq.current:.0f} MHz (max: {cpu_freq.max:.0f} MHz)
  Total RAM: {mem.total / (1024**3):.1f} GB
  Available RAM: {mem.available / (1024**3):.1f} GB ({mem.percent}% used)

{'='*80}

"""
    # Write directly to log file
    with open(log_filename, 'w', encoding='utf-8') as f:
        f.write(header)

# Write header FIRST
write_log_header()

# File handler - detailed logs with milliseconds for this session
file_handler = logging.FileHandler(
    log_filename,
    mode='a',  # Append to file (header already written)
    encoding='utf-8'  # Support Unicode characters in logs
)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s.%(msecs)03d [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
))

# Console handler - minimal output for critical events only
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.WARNING)  # Only warnings and errors to console
console_handler.setFormatter(logging.Formatter(
    "%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
))

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG,
    handlers=[file_handler, console_handler]
)

# Reduce uvicorn access log verbosity
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# CPU monitoring
session_start_time = datetime.now()
peak_cpu_percent = 0.0
peak_memory_mb = 0.0


@app.on_event("startup")
async def startup_event():
    """Initialize LLM provider on startup."""
    global llm_provider, peak_cpu_percent, peak_memory_mb

    # Print startup messages to console
    print("=" * 60)
    print("Starting Alfy backend...")
    print(f"LLM Provider: {settings.llm_provider.value.upper()}")
    if settings.llm_provider.value == "claude":
        print(f"Claude Model: {settings.claude_model.value}")
        print(f"Temperature: {settings.claude_temperature}")
    elif settings.llm_provider.value == "openai":
        print(f"OpenAI Model: {settings.openai_model}")
    elif settings.llm_provider.value == "local":
        print(f"Local Model: {settings.local_agent_model_path}")
    print(f"Session log: {log_filename}")
    print("=" * 60)

    # Detailed logging to file
    logger.info("="*60)
    logger.info("Starting Alfy backend...")
    logger.info(f"LLM Provider: {settings.llm_provider.value}")
    logger.info(f"Session log file: {log_filename}")
    logger.info("="*60)

    try:
        # Monitor CPU during provider initialization
        process = psutil.Process()
        cpu_before = process.cpu_percent(interval=0.1)

        # Initialize LLM provider
        llm_provider = await LLMProviderFactory.get_provider()

        cpu_after = process.cpu_percent(interval=0.1)
        mem_mb = process.memory_info().rss / (1024 * 1024)

        peak_cpu_percent = max(peak_cpu_percent, cpu_after)
        peak_memory_mb = max(peak_memory_mb, mem_mb)

        provider_name = llm_provider.__class__.__name__
        print(f"[OK] LLM provider initialized: {provider_name}")
        logger.info(f"[OK] LLM provider initialized: {provider_name}")
        logger.info(f"[INFO] CPU usage during init: {cpu_after:.1f}%")
        logger.info(f"[INFO] Memory usage: {mem_mb:.1f} MB")
    except Exception as e:
        print(f"[FAIL] Failed to initialize LLM provider: {e}")
        logger.error(f"[FAIL] Failed to initialize LLM provider: {e}", exc_info=True)
        raise

    print("=" * 60)
    print("Alfy backend ready!")
    print("=" * 60)
    logger.info("="*60)
    logger.info("Alfy backend ready!")
    logger.info("="*60)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup LLM provider and log session statistics on shutdown."""
    global llm_provider

    # Cleanup provider
    if llm_provider:
        logger.info("Cleaning up LLM provider...")
        await LLMProviderFactory.cleanup()

    session_duration = datetime.now() - session_start_time
    process = psutil.Process()
    final_memory_mb = process.memory_info().rss / (1024 * 1024)

    logger.info("="*80)
    logger.info("SESSION SUMMARY")
    logger.info("="*80)
    logger.info(f"[INFO] LLM Provider: {settings.llm_provider.value}")
    logger.info(f"[INFO] Session duration: {session_duration}")
    logger.info(f"[INFO] Peak CPU usage: {peak_cpu_percent:.1f}%")
    logger.info(f"[INFO] Peak memory usage: {peak_memory_mb:.1f} MB")
    logger.info(f"[INFO] Final memory usage: {final_memory_mb:.1f} MB")
    logger.info("="*80)

    # Log token usage statistics
    token_summary = token_tracker.get_formatted_summary()
    for line in token_summary.split('\n'):
        logger.info(line)

    # Also print to console for immediate visibility
    print("\n" + token_summary)

    logger.info("="*80)
    logger.info("Session ended")
    logger.info("="*80)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:5173",
        "tauri://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Include API Routes
# ============================================================================

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(gdrive_auth.router, prefix="/api", tags=["gdrive"])
app.include_router(email.router, prefix="/api", tags=["email"])


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health")
def health():
    """Simple liveness endpoint."""
    return {"status": "ok"}


@app.get("/status")
def status():
    """Get backend status including LLM provider state."""
    provider_info = {
        "provider": settings.llm_provider.value,
        "status": "ready" if llm_provider else "not_initialized"
    }

    if settings.llm_provider.value == "claude":
        provider_info["model"] = settings.claude_model.value
        provider_info["api_configured"] = bool(settings.anthropic_api_key)
    elif settings.llm_provider.value == "openai":
        provider_info["model"] = settings.openai_model
        provider_info["api_configured"] = bool(settings.openai_api_key)
    elif settings.llm_provider.value == "local":
        provider_info["model"] = settings.local_agent_model_path

    return {
        "status": "ok",
        "llm": provider_info,
        "storage": {
            "path": str(conv_store.storage_dir.absolute()),
            "conversation_count": len(conv_store.list_all())
        }
    }


# ============================================================================
# Chat Endpoint
# ============================================================================

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_id: Optional[str] = Field(None, description="Conversation ID (creates new if omitted)")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant's reply")
    conversation_id: str = Field(..., description="Conversation ID")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Send a message and get a reply using the configured LLM provider.

    If conversation_id is provided, appends to existing conversation.
    If omitted, creates a new conversation.
    """
    if not llm_provider:
        raise HTTPException(status_code=503, detail="LLM provider not initialized")

    try:
        # Load or create conversation
        if request.conversation_id:
            conversation = conv_store.load(request.conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            # Create new conversation with title from first message
            title = request.message[:50] + ("..." if len(request.message) > 50 else "")
            conversation = conv_store.create_new(title=title)

        # Add user message
        conversation.add_message(role="user", content=request.message)

        # Build system prompt
        system_prompt = "You are Alfy, a helpful AI assistant. Be concise, friendly, and helpful."

        # Build conversation context (last 10 messages)
        conversation_context = "\n".join([
            f"{msg.role}: {msg.content}"
            for msg in conversation.messages[-10:]
        ])

        # Generate response with monitoring
        global peak_cpu_percent, peak_memory_mb
        process = psutil.Process()
        cpu_before = process.cpu_percent(interval=0.1)

        logger.info(f"Generating response with {settings.llm_provider.value} provider")

        raw_reply = await llm_provider.generate(
            prompt=conversation_context,
            system_prompt=system_prompt,
            max_tokens=settings.claude_max_tokens if settings.llm_provider.value == "claude" else settings.local_max_tokens,
            temperature=settings.claude_temperature if settings.llm_provider.value == "claude" else settings.local_temperature
        )

        cpu_after = process.cpu_percent(interval=0.1)
        mem_mb = process.memory_info().rss / (1024 * 1024)
        peak_cpu_percent = max(peak_cpu_percent, cpu_after)
        peak_memory_mb = max(peak_memory_mb, mem_mb)

        logger.info(f"[INFO] Inference CPU: {cpu_after:.1f}%, Memory: {mem_mb:.1f} MB")
        logger.info(f"[INFO] Response length: {len(raw_reply)} chars")

        # Clean response (remove thinking tags for user display)
        cleaned_reply, raw_for_logging = clean_llm_response(raw_reply)

        # Get token usage from last tracked usage
        last_usage = token_tracker.get_last_usage()
        input_tokens = last_usage.input_tokens if last_usage else None
        output_tokens = last_usage.output_tokens if last_usage else None

        # Add assistant message (cleaned for display, raw for logging)
        conversation.add_message(
            role="assistant",
            content=cleaned_reply,
            raw_content=raw_for_logging,
            input_tokens=input_tokens,
            output_tokens=output_tokens
        )

        # Save conversation
        conv_store.save(conversation)

        return ChatResponse(
            reply=cleaned_reply,
            conversation_id=conversation.id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[FAIL] Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat-with-tools", response_model=ChatResponse)
async def chat_with_tools(request: ChatRequest) -> ChatResponse:
    """
    Chat endpoint with tool calling support.

    Allows AI assistant to search for and manipulate files on the system.
    Works with Claude/OpenAI providers. Local LLM returns text-only responses.
    """
    if not llm_provider:
        raise HTTPException(status_code=503, detail="LLM provider not initialized")

    try:
        # Load or create conversation
        if request.conversation_id:
            conversation = conv_store.load(request.conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            title = request.message[:50] + ("..." if len(request.message) > 50 else "")
            conversation = conv_store.create_new(title=title)

        # Add user message
        conversation.add_message(role="user", content=request.message)

        # Build system prompt with tool instructions
        system_prompt = """You are Alfy, a helpful AI assistant with access to file system tools.

You can:
- Search for files by name, extension, or recent modifications
- Read file contents
- Write and modify files
- Copy, move files
- Get file information

When a user asks you to interact with files, use the appropriate tools. Be helpful and explain what you're doing."""

        # Get tool definitions
        tools = get_all_tools()

        # Build message history
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in conversation.messages[-10:]  # Last 10 messages
        ]

        # Tool calling loop (may need multiple iterations)
        max_iterations = 5
        iteration = 0
        final_response = ""

        while iteration < max_iterations:
            iteration += 1
            logger.info(f"Tool calling iteration {iteration}")

            # Call LLM provider with tools
            response = await llm_provider.generate_with_tools(
                messages=messages,
                tools=tools,
                system_prompt=system_prompt
            )

            # Check if LLM wants to use tools
            if response["tool_calls"]:
                logger.info(f"LLM requested {len(response['tool_calls'])} tool calls")

                # Execute each tool call
                tool_results = []
                for tool_call in response["tool_calls"]:
                    tool_name = tool_call["name"]
                    tool_input = tool_call["input"]
                    tool_id = tool_call["id"]

                    logger.info(f"Executing tool: {tool_name}")

                    # Execute the tool
                    result = await tool_executor.execute_tool(tool_name, tool_input)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": str(result)
                    })

                # Add assistant's tool use to messages
                messages.append({
                    "role": "assistant",
                    "content": response["content"] + [
                        {"type": "tool_use", "id": tc["id"], "name": tc["name"], "input": tc["input"]}
                        for tc in response["tool_calls"]
                    ]
                })

                # Add tool results to messages
                messages.append({
                    "role": "user",
                    "content": tool_results
                })

                # Continue loop to let Claude process tool results
                continue

            else:
                # No tool calls - we have the final response
                for content_block in response["content"]:
                    if content_block["type"] == "text":
                        final_response += content_block["text"]

                break

        if not final_response:
            final_response = "I apologize, but I couldn't generate a response."

        # Clean response
        cleaned_reply, raw_for_logging = clean_llm_response(final_response)

        # Get token usage from last tracked usage
        last_usage = token_tracker.get_last_usage()
        input_tokens = last_usage.input_tokens if last_usage else None
        output_tokens = last_usage.output_tokens if last_usage else None

        # Add assistant message
        conversation.add_message(
            role="assistant",
            content=cleaned_reply,
            raw_content=raw_for_logging,
            input_tokens=input_tokens,
            output_tokens=output_tokens
        )

        # Save conversation
        conv_store.save(conversation)

        logger.info(f"Tool-enabled chat completed after {iteration} iterations")

        return ChatResponse(
            reply=cleaned_reply,
            conversation_id=conversation.id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tool-enabled chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Conversation History Endpoints
# ============================================================================

class ConversationSummary(BaseModel):
    id: str
    title: str
    preview: str
    updated_at: str
    message_count: int


@app.get("/conversations", response_model=List[ConversationSummary])
def list_conversations(limit: Optional[int] = 50):
    """List all conversations (most recent first)."""
    try:
        return conv_store.get_summaries(limit=limit)
    except Exception as e:
        logger.error(f"[FAIL] Failed to list conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/conversations/{conversation_id}", response_model=Conversation)
def get_conversation(conversation_id: str):
    """Get a specific conversation with all messages."""
    conversation = conv_store.load(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    success = conv_store.delete(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}


class UpdateTitleRequest(BaseModel):
    title: str = Field(..., description="New conversation title")


@app.patch("/conversations/{conversation_id}/title")
def update_conversation_title(conversation_id: str, request: UpdateTitleRequest):
    """Update a conversation's title."""
    conversation = conv_store.load(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.update_title(request.title)
    conv_store.save(conversation)

    return {"success": True, "title": conversation.title}


@app.post("/conversations/new")
def create_conversation():
    """Create a new empty conversation."""
    conversation = conv_store.create_new()
    return {"id": conversation.id, "title": conversation.title}
