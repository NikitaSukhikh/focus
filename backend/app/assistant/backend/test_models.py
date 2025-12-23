# test_models.py

from llama_cpp import Llama

print("Loading Router model...")
router = Llama(
    model_path="D:/alfy/backend/llm_models/Qwen_Qwen3-1.7B-Q4_K_M.gguf",
    n_ctx=2048,
    n_threads=4,
    verbose=False
)

print("Testing Router...")
response = router.create_chat_completion(
    messages=[{"role": "user", "content": "Say hello in one word."}],
    max_tokens=10
)
print(f"Router says: {response['choices'][0]['message']['content']}")

print("\nLoading Agent model...")
agent = Llama(
    model_path="D:/alfy/backend/llm_models/Qwen_Qwen3-8B-Q4_K_M.gguf",
    n_ctx=4096,
    n_threads=6,
    verbose=False
)

print("Testing Agent...")
response = agent.create_chat_completion(
    messages=[{"role": "user", "content": "What is 2+2 Answer briefly."}],
    max_tokens=20
)
print(f"Agent says: {response['choices'][0]['message']['content']}")

print("\n Both models working!")