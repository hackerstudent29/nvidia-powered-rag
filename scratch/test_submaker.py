import asyncio
import edge_tts

async def test():
    text = "Mohamed Sathak A.J. College of Engineering provides scholarships for students."
    communicate = edge_tts.Communicate(text, "en-IN-NeerjaNeural")
    submaker = edge_tts.SubMaker()
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            pass
        elif chunk["type"] == "WordBoundary":
            submaker.feed(chunk)
            
    print("Submaker cue count:", len(submaker.cues))
    srt = submaker.get_srt()
    print("SRT output preview:\n", srt[:500])

if __name__ == "__main__":
    asyncio.run(test())
