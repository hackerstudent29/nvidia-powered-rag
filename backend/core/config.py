"""
Lorin AI — Enterprise Configuration & Constants Module
======================================================
Centralized configuration, model definitions, pricing rates, and environment settings.
"""

import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env")
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path, override=True)
load_dotenv()

# System & Infrastructure Configurations
DATABASE_URL = os.getenv("DATABASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
VERCEL_AI_GATEWAY_KEY = os.getenv("AI_GATEWAY_API_KEY") or os.getenv("VERCEL_AI_GATEWAY_KEY") or os.getenv("AI_GATEWAY_API_KEY_BACKUP")
VERCEL_AI_GATEWAY_URL = os.getenv("VERCEL_AI_GATEWAY_URL", "https://ai-gateway.vercel.sh/v1")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "msajceadmin")
JWT_SECRET = os.getenv("JWT_SECRET", "msajcea_super_secret_jwt_key_2026")

COLLECTION_NAME = "msajce_knowledgebase"

# Pricing Models per 1,000 Tokens (USD)
MODEL_PRICING = {
    "nvidia/nemotron-3-super-120b-a12b": {
        "name": "NVIDIA Nemotron 3 Super 120B",
        "provider": "NVIDIA NIM",
        "input_per_1k": 0.00015,
        "output_per_1k": 0.00045,
        "cache_per_1k": 0.00002
    },
    "google/gemini-2.5-flash-lite": {
        "name": "Google Gemini 2.5 Flash Lite",
        "provider": "Vercel AI Gateway",
        "input_per_1k": 0.000075,
        "output_per_1k": 0.00030,
        "cache_per_1k": 0.00001
    },
    "alibaba/qwen-3-32b": {
        "name": "Alibaba Qwen 3 32B Instruct",
        "provider": "Vercel AI Gateway",
        "input_per_1k": 0.00010,
        "output_per_1k": 0.00035,
        "cache_per_1k": 0.00001
    },
    "default": {
        "name": "Lorin AI Standard Engine",
        "provider": "Enterprise RAG Pipeline",
        "input_per_1k": 0.00010,
        "output_per_1k": 0.00030,
        "cache_per_1k": 0.00001
    }
}

EMBEDDING_PRICING = {
    "name": "NVIDIA Llama Nemotron Embed 1024-d",
    "input_per_1k": 0.000015
}
