import asyncio
import edge_tts

async def test():
    text = "Mohamed Sathak A.J. College of Engineering is a premier institution in Chennai. It offers 12 UG courses and 2 PG courses. Admission is based on TNEA counseling."
    communicate = edge_tts.Communicate(text, "en-IN-NeerjaNeural")
    sentences = []
    
    async for chunk in communicate.stream():
        if chunk["type"] == "SentenceBoundary":
            start_ms = chunk["offset"] / 10000.0
            duration_ms = chunk["duration"] / 10000.0
            sentences.append({
                "text": chunk["text"],
                "start_ms": start_ms,
                "end_ms": start_ms + duration_ms
            })
            
    print(f"Captured {len(sentences)} sentence boundaries:")
    for s in sentences:
        print(s)

if __name__ == "__main__":
    asyncio.run(test())
