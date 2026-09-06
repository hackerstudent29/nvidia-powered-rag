import asyncio
import edge_tts

async def test():
    text = "Mohamed Sathak A.J. College of Engineering provides scholarships for students."
    communicate = edge_tts.Communicate(text, "en-IN-NeerjaNeural")
    word_boundaries = []
    
    async for chunk in communicate.stream():
        if chunk["type"] == "WordBoundary":
            # offset and duration are in 100ns units (divide by 10,000 for ms)
            start_ms = chunk["offset"] / 10000.0
            duration_ms = chunk["duration"] / 10000.0
            word = chunk["text"]
            word_boundaries.append({
                "word": word,
                "start_ms": start_ms,
                "end_ms": start_ms + duration_ms
            })
            
    print(f"Total word boundaries captured: {len(word_boundaries)}")
    for b in word_boundaries[:10]:
        print(b)

if __name__ == "__main__":
    asyncio.run(test())
