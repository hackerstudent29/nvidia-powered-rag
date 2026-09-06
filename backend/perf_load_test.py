import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import asyncio
import time
import json
import httpx
from typing import List, Dict, Any

API_STREAM_URL = "http://localhost:8000/api/chat/stream"

TEST_QUERIES = [
    "What is the annual tuition fee for B.E. Computer Science?",
    "What is the TNEA counseling code for MSAJCEA?",
    "Where is the campus located and how can I reach by bus?",
    "Compare CSE vs IT placements and highest salary package",
    "What are the hostel and mess facilities for boys and girls?",
    "Where can I download the autonomous regulation PDF?"
]

async def send_single_request(client: httpx.AsyncClient, query_idx: int) -> Dict[str, Any]:
    query = TEST_QUERIES[query_idx % len(TEST_QUERIES)]
    payload = {
        "message": query,
        "model": "zai/glm-5.3-flash",
        "session_id": f"perf_{time.time()}_{query_idx}"
    }

    t0 = time.time()
    ttft_ms = None
    first_token_received = False
    token_count = 0

    try:
        async with client.stream("POST", API_STREAM_URL, json=payload, timeout=30.0) as response:
            if response.status_code == 200:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if not first_token_received and ("token" in data_str or "sources" in data_str):
                            first_token_received = True
                            ttft_ms = int((time.time() - t0) * 1000)
                        if "token" in data_str:
                            token_count += 1
    except Exception as e:
        pass

    total_latency_ms = int((time.time() - t0) * 1000)
    return {
        "ttft_ms": ttft_ms or total_latency_ms,
        "latency_ms": total_latency_ms,
        "tokens": token_count,
        "success": first_token_received
    }

async def run_concurrency_tier(concurrency_level: int):
    print(f"\n⚡ Running Concurrency Load Test: {concurrency_level} Concurrent Users", flush=True)
    print("-" * 65, flush=True)

    limits = httpx.Limits(max_keepalive_connections=concurrency_level + 10, max_connections=concurrency_level + 20)
    async with httpx.AsyncClient(limits=limits, timeout=40.0) as client:
        tasks = [send_single_request(client, i) for i in range(concurrency_level)]
        t_start = time.time()
        results = await asyncio.gather(*tasks)
        t_total = time.time() - t_start

    ttfts = [r["ttft_ms"] for r in results if r["success"]]
    latencies = [r["latency_ms"] for r in results if r["success"]]
    successes = sum(1 for r in results if r["success"])

    if ttfts:
        ttfts.sort()
        latencies.sort()
        p50_ttft = ttfts[len(ttfts) // 2]
        p95_ttft = ttfts[int(len(ttfts) * 0.95)]
        p50_lat = latencies[len(latencies) // 2]
        p95_lat = latencies[int(len(latencies) * 0.95)]
        rps = round(concurrency_level / t_total, 2)

        print(f"• Success Rate:      {successes}/{concurrency_level} ({round(successes/concurrency_level*100, 1)}%)", flush=True)
        print(f"• Throughput:        {rps} Req/sec", flush=True)
        print(f"• P50 TTFT Latency:  {p50_ttft} ms  (Target: < 400 ms) {'✅ SLA MET' if p50_ttft <= 400 else '⚠️'}", flush=True)
        print(f"• P95 TTFT Latency:  {p95_ttft} ms  (Target: < 900 ms)", flush=True)
        print(f"• P50 End-to-End:    {p50_lat} ms", flush=True)
        print(f"• P95 End-to-End:    {p95_lat} ms", flush=True)

async def main():
    print("==================================================================", flush=True)
    print("🚀 NVIDIA RAG-Perf: Concurrency Load Profiling Engine", flush=True)
    print("==================================================================", flush=True)

    for level in [5, 10, 15]:
        await run_concurrency_tier(level)
        await asyncio.sleep(1.0)

    print("\n==================================================================", flush=True)
    print("🎉 Load Profiling Complete!", flush=True)
    print("==================================================================\n", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
