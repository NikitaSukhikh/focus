"""
Example of main.py modified to use the LLM provider abstraction.

This demonstrates how to integrate the provider factory into the existing main.py
to support switching between local LLM and Claude API.

Key changes:
1. Import LLMProviderFactory instead of SimpleLLM directly
2. Get provider instance on startup
3. Use provider.generate() instead of llm.generate()
4. Provider selection is controlled via ALFY_LLM_PROVIDER environment variable
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import provider factory instead of SimpleLLM
from app.core.llm_provider import LLMProviderFactory
from app.config import settings
from app.storage.conversation_store import ConversationStore
from app.models.conversation import Conversation
from app.utils.text_processing import clean_llm_response

app = FastAPI(title="Alfy - Multi-Provider")

# Initialize services
conv_store = ConversationStore()
llm_provider = None  # Will be initialized on startup

# Configure logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
session_timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M")
log_filename = log_dir / f"alfy_{session_timestamp}.log"

logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.FileHandler(log_filename, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_event():
    """Initialize LLM provider on startup."""
    global llm_provider

    print("=" * 60)
    print("Starting Alfy backend (multi-provider)...")
    print(f"LLM Provider: {settings.llm_provider.value}")
    print(f"Session log: {log_filename}")
    print("=" * 60)

    try:
        # Get provider instance based on configuration
        llm_provider = await LLMProviderFactory.get_provider()
        logger.info(f"LLM provider initialized: {llm_provider.__class__.__name__}")

        # Show provider-specific info
        if settings.llm_provider.value == "claude":
            logger.info(f"Using Claude model: {settings.claude_model.value}")
        elif settings.llm_provider.value == "openai":
            logger.info(f"Using OpenAI model: {settings.openai_model}")
        elif settings.llm_provider.value == "local":
            logger.info(f"Using local model: {settings.local_agent_model_path}")

        print("[OK] LLM provider ready")

    except Exception as e:
        logger.error(f"Failed to initialize LLM provider: {e}", exc_info=True)
        print(f"[FAIL] Failed to initialize LLM provider: {e}")
        raise

    print("=" * 60)
    print("Alfy backend ready!")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup LLM provider on shutdown."""
    global llm_provider

    if llm_provider:
        logger.info("Cleaning up LLM provider...")
        await LLMProviderFactory.cleanup()
        logger.info("LLM provider cleaned up")


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health")
def health():
    """Simple liveness endpoint."""
    return {"status": "ok"}


@app.get("/status")
def status():
    """Get backend status including LLM provider info."""
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
        provider_info["model_exists"] = Path(settings.local_agent_model_path).exists()

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
    conversation_id: Optional[str] = Field(None, description="Conversation ID")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant's reply")
    conversation_id: str = Field(..., description="Conversation ID")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Send a message and get a reply using the configured LLM provider.
    """
    if not llm_provider:
        raise HTTPException(
            status_code=503,
            detail="LLM provider not initialized"
        )

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

        # Build system prompt
        system_prompt = "You are Alfy, a helpful AI assistant. Be concise, friendly, and helpful."

        # Build conversation context
        conversation_context = "\n".join([
            f"{msg.role}: {msg.content}"
            for msg in conversation.messages[-10:]  # Last 10 messages
        ])

        # Generate response using provider abstraction
        logger.info(f"Generating response with {settings.llm_provider.value} provider")

        raw_reply = await llm_provider.generate(
            prompt=conversation_context,
            system_prompt=system_prompt,
            max_tokens=512,
            temperature=0.7
        )

        # Clean response
        cleaned_reply, raw_for_logging = clean_llm_response(raw_reply)

        # Add assistant message
        conversation.add_message(
            role="assistant",
            content=cleaned_reply,
            raw_content=raw_for_logging
        )

        # Save conversation
        conv_store.save(conversation)

        logger.info(f"Response generated ({len(cleaned_reply)} chars)")

        return ChatResponse(
            reply=cleaned_reply,
            conversation_id=conversation.id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Provider Switching Endpoint (Optional)
# ============================================================================

class SwitchProviderRequest(BaseModel):
    provider: str = Field(..., description="Provider to switch to: local, claude, or openai")


@app.post("/switch-provider")
async def switch_provider(request: SwitchProviderRequest):
    """
    Switch to a different LLM provider at runtime.

    Note: This changes the global provider setting for all subsequent requests.
    """
    global llm_provider

    valid_providers = ["local", "claude", "openai"]
    if request.provider not in valid_providers:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Must be one of: {', '.join(valid_providers)}"
        )

    try:
        # Import LLMProvider enum
        from app.config import LLMProvider

        # Update settings
        old_provider = settings.llm_provider.value
        settings.llm_provider = LLMProvider(request.provider)

        # Get new provider instance
        llm_provider = await LLMProviderFactory.get_provider()

        logger.info(f"Switched provider from {old_provider} to {request.provider}")

        return {
            "success": True,
            "old_provider": old_provider,
            "new_provider": request.provider,
            "message": f"Successfully switched to {request.provider} provider"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Provider switch error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Conversation History Endpoints (same as before)
# ============================================================================

class ConversationSummary(BaseModel):
    id: str
    title: str
    preview: str
    updated_at: str
    message_count: int


@app.get("/conversations", response_model=List[ConversationSummary])
def list_conversations(limit: Optional[int] = 50):
    """List all conversations."""
    try:
        return conv_store.get_summaries(limit=limit)
    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/conversations/{conversation_id}", response_model=Conversation)
def get_conversation(conversation_id: str):
    """Get a specific conversation."""
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload
    )
