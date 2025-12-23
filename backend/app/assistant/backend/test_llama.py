#!/usr/bin/env python3
"""Test script to verify llama.cpp works correctly."""

import sys
import time

print("=" * 60)
print("Testing llama-cpp-python installation and model loading")
print("=" * 60)

# Test 1: Import
print("\n[1/4] Testing import...")
try:
    from llama_cpp import Llama
    import llama_cpp
    print(f"[OK] llama-cpp-python imported successfully")
    print(f"  Version: {llama_cpp.__version__}")
except ImportError as e:
    print(f"✗ Failed to import: {e}")
    sys.exit(1)

# Test 2: Find model
print("\n[2/4] Looking for model file...")
from pathlib import Path
models = list(Path("llm_models").glob("*8B*Q4_K_M*.gguf"))
if not models:
    print("✗ No 8B model found!")
    sys.exit(1)
model_path = str(models[0])
print(f"[OK] Found model: {model_path}")

# Test 3: Load model
print("\n[3/4] Loading model (this may take 5-10 seconds)...")
start = time.time()
try:
    model = Llama(
        model_path=model_path,
        n_ctx=512,  # Very small context for testing
        n_threads=2,
        n_batch=128,
        n_gpu_layers=0,
        verbose=True,
    )
    load_time = time.time() - start
    print(f"[OK] Model loaded in {load_time:.2f}s")
except Exception as e:
    print(f"✗ Failed to load model: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Generate
print("\n[4/4] Testing generation...")
start = time.time()
try:
    response = model.create_chat_completion(
        messages=[
            {"role": "user", "content": "Say 'hello' and nothing else"}
        ],
        max_tokens=10,
        temperature=0.0,
    )
    gen_time = time.time() - start
    result = response["choices"][0]["message"]["content"]
    print(f"[OK] Generated response in {gen_time:.2f}s")
    print(f"  Response: {result}")
except Exception as e:
    print(f"✗ Failed to generate: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("All tests passed! llama.cpp is working correctly.")
print("=" * 60)
