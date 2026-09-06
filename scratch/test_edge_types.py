import asyncio
import edge_tts

async def test():
    text = "Hello world"
    communicate = edge_tts.Communicate(text, "en-IN-NeerjaNeural")
    chunk_types = set()
    async for chunk in communicate.stream():
        chunk_types.add(chunk["type"])
        print("Chunk:", chunk["type"], {k: v for k, v in chunk.items() if k != "data"})
    print("All chunk types seen:", chunk_types)

if __name__ == "__main__":
    asyncio.run(test())
