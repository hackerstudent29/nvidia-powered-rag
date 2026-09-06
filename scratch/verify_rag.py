import os
import sys
import requests
from dotenv import load_dotenv
from qdrant_client import QdrantClient

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
COLLECTION_NAME = "nvidia_powered_ai"

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
col = client.get_collection(COLLECTION_NAME)
print(f"Collection status: {col.status}, total points: {col.points_count}")

query = "What is the full name and abbreviation of the college?"
res = requests.post(
    "https://integrate.api.nvidia.com/v1/embeddings",
    headers={"Authorization": f"Bearer {NVIDIA_API_KEY}", "Content-Type": "application/json"},
    json={"input": [query], "model": "nvidia/llama-nemotron-embed-vl-1b-v2", "input_type": "query"},
    timeout=30
)
vector = res.json()["data"][0]["embedding"]
query_res = client.query_points(collection_name=COLLECTION_NAME, query=vector, limit=3)

print(f"\nQuery: '{query}'")
for r in query_res.points:
    print(f"[{r.score:.4f}] Chunk: {r.payload.get('chunk_id')}")
    print(f"Text snippet: {r.payload.get('text')[:250]}...\n")
