# download_models.py

from huggingface_hub import hf_hub_download

print("Downloading Router model (Qwen3-1.7B)...")
hf_hub_download(
    repo_id="bartowski/Qwen_Qwen3-1.7B-GGUF",
    filename="Qwen_Qwen3-1.7B-Q4_K_M.gguf",
    local_dir="D:/alfy/backend/llm_models"
)
print("Router model downloaded!")

print("Downloading Agent model (Qwen3-8B)...")
hf_hub_download(
    repo_id="bartowski/Qwen_Qwen3-8B-GGUF",
    filename="Qwen_Qwen3-8B-Q4_K_M.gguf",
    local_dir="D:/alfy/backend/llm_models"
)
print("Agent model downloaded!")

print("Done! Models saved to D:/alfy/backend/llm_models/")