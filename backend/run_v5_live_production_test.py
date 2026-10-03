"""
V5 Live Production Test Script
===============================
Runs exact production queries through process_lorin_query() to verify live pipeline behavior.
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import process_lorin_query, init_rag_resources

def run_live_test():
    print("[INIT] Initializing RAG resources...")
    init_rag_resources()
    test_queries = [
        {
            "id": "PROD-00",
            "category": "exact_live_query",
            "query": "What is the landline contact number of MSAJCE?",
            "expected": "044-27476300"
        },
        {
            "id": "PROD-01",
            "category": "acronym",
            "query": "What social service activities are conducted by the YRC unit?",
            "expected": "Youth Red Cross / blood donation / social service"
        },
        {
            "id": "PROD-02",
            "category": "table",
            "query": "What is the tuition fee for B.Tech Information Technology?",
            "expected": "Fee structure / Information Technology"
        },
        {
            "id": "PROD-03",
            "category": "multi_hop",
            "query": "Who is the Principal of MSAJCE and what is the college landline number?",
            "expected": "Dr. K.S. Srinivasan & 044-27476300"
        },
        {
            "id": "PROD-04",
            "category": "follow_up",
            "query": "What about girls?",
            "history": [
                {"role": "user", "content": "What is the hostel fee?"},
                {"role": "assistant", "content": "Hostel facilities are available for boys and girls."}
            ],
            "expected": "Hostel fee for girls"
        },
        {
            "id": "PROD-05",
            "category": "list",
            "query": "List all undergraduate B.E. and B.Tech degree programs offered by MSAJCE",
            "expected": "CSE, IT, ECE, EEE, MECH, CIVIL, AI&DS, CSBS, Cyber Security"
        },
        {
            "id": "PROD-06",
            "category": "paraphrase",
            "query": "How can I call the college office on phone?",
            "expected": "044-27476300"
        },
        {
            "id": "PROD-07",
            "category": "basic_factual",
            "query": "What is the TNEA counselling code of MSAJCE?",
            "expected": "1301"
        },
        {
            "id": "PROD-08",
            "category": "entity_resolution",
            "query": "What village adoption activities are carried out by the UBA cell?",
            "expected": "Unnat Bharat Abhiyan / adopted 5 villages / Siruseri"
        },
        {
            "id": "PROD-09",
            "category": "negative_safety",
            "query": "What is the fee for Aerospace Engineering at MSAJCE?",
            "expected": "ABSTAIN (Department not offered)"
        },
        {
            "id": "PROD-10",
            "category": "medical_isolation",
            "query": "Does MSAJCE offer B.Tech AIDS for HIV medical treatments?",
            "expected": "Artificial Intelligence & Data Science (Academic, not HIV medical)"
        }
    ]

    print("=" * 80)
    print("🚀 LORIN AI V5 LIVE PRODUCTION TEST RESULTS")
    print("=" * 80)

    results = []
    for item in test_queries:
        t0 = time.time()
        q = item["query"]
        hist = item.get("history")
        res = process_lorin_query(q, conversation_history=hist)
        elapsed = round((time.time() - t0) * 1000, 2)

        top_chunk = res["retrieved_chunks"][0] if res.get("retrieved_chunks") else {}
        decision = res.get("evidence_decision")
        response_text = res.get("response")

        print(f"\n[{item['id']}] Category: {item['category'].upper()}")
        print(f"Query: \"{q}\"")
        if hist:
            print(f"History: {hist[0]['content']}")
        print(f"Decision: {decision} ({elapsed} ms)")
        print(f"Top Retracted Document: {top_chunk.get('source_file')} - {top_chunk.get('title')}")
        print(f"Response: {response_text[:200]}...")
        
        results.append({
            "id": item["id"],
            "category": item["category"],
            "query": q,
            "decision": decision,
            "top_doc": top_chunk.get("source_file"),
            "latency_ms": elapsed,
            "response_snippet": response_text[:150]
        })

    print("\n" + "=" * 80)
    print("SUMMARY REPORT")
    print("=" * 80)
    for r in results:
        print(f"{r['id']} | {r['category']:<18} | Decision: {r['decision']:<8} | Doc: {r['top_doc']} ({r['latency_ms']} ms)")

if __name__ == "__main__":
    run_live_test()
