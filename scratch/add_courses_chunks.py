import json
import os
import uuid
import hashlib

courses_text_1 = """# Complete List of 12 UG B.E./B.Tech and 2 PG M.E. Degree Programs Offered at MSAJCE (TNEA Code 1301)

Mohamed Sathak A.J. College of Engineering (MSAJCE) offers 12 Undergraduate (UG) B.E./B.Tech degree programs and 2 Postgraduate (PG) M.E. degree programs, all approved by AICTE and affiliated to Anna University, Chennai.

### 🎓 Undergraduate (UG) Programs (4 Years):
1. B.E. Computer Science and Engineering (CSE) - 60 Seats (30 Govt / 30 Mgmt)
2. B.Tech Information Technology (IT) - 60 Seats (30 Govt / 30 Mgmt)
3. B.Tech Artificial Intelligence and Data Science (AI & DS) - 60 Seats (30 Govt / 30 Mgmt)
4. B.Tech Artificial Intelligence and Machine Learning (AI & ML) - 60 Seats (30 Govt / 30 Mgmt)
5. B.E. Electronics and Communication Engineering (ECE) - 60 Seats (30 Govt / 30 Mgmt)
6. B.E. Mechanical Engineering - 60 Seats (30 Govt / 30 Mgmt)
7. B.E. Electrical and Electronics Engineering (EEE) - 30 Seats (15 Govt / 15 Mgmt)
8. B.E. Civil Engineering - 30 Seats (15 Govt / 15 Mgmt)
9. B.E. Computer Science and Engineering (Cyber Security) - 30 Seats (15 Govt / 15 Mgmt)
10. B.Tech Computer Science and Business Systems (CSBS) - 30 Seats (15 Govt / 15 Mgmt)
11. B.Tech Electronics Engineering (VLSI Design & Technology) - 30 Seats (15 Govt / 15 Mgmt)
12. B.Tech ECE (Advanced Communication Technology - ACT) - 30 Seats (15 Govt / 15 Mgmt)

### 🎓 Postgraduate (PG) Programs (2 Years):
1. M.E. Computer Science and Engineering - 9 Seats (3 Govt / 6 Mgmt)
2. M.E. Structural Engineering - 18 Seats (6 Govt / 12 Mgmt)

TNEA Counseling Code: 1301. Approved by AICTE, affiliated to Anna University, NAAC A+ Grade accredited."""

courses_text_2 = """### 📚 MSAJCE Courses Offered, Intake Capacity & Admission Cutoff Overview
- B.E. Computer Science and Engineering (CSE): 60 Seats (Government Quota & Management Quota)
- B.Tech Information Technology (IT): 60 Seats
- B.Tech Artificial Intelligence and Data Science (AI & DS): 60 Seats
- B.Tech Artificial Intelligence and Machine Learning (AI & ML): 60 Seats
- B.E. Electronics and Communication Engineering (ECE): 60 Seats
- B.E. Mechanical Engineering: 60 Seats
- B.E. Electrical and Electronics Engineering (EEE): 30 Seats
- B.E. Civil Engineering: 30 Seats
- B.E. CSE (Cyber Security): 30 Seats
- B.Tech Computer Science and Business Systems (CSBS): 30 Seats
- B.Tech Electronics Engineering (VLSI Design & Technology): 30 Seats
- B.Tech ECE (Advanced Communication Technology): 30 Seats
- M.E. Computer Science and Engineering (PG): 9 Seats
- M.E. Structural Engineering (PG): 18 Seats

All degree courses follow Anna University regulations and 2021 CBCS curriculum."""

bm25_file = "d:/.gemini/bots/nvidia powered AI/backend/data/bm25_chunks.json"

with open(bm25_file, "r", encoding="utf-8") as f:
    chunks = json.load(f)

parent_id = str(uuid.uuid4())
hash1 = hashlib.sha256(courses_text_1.encode("utf-8")).hexdigest()[:16]
point_id1 = int(hash1, 16) % (10**7)

hash2 = hashlib.sha256(courses_text_2.encode("utf-8")).hexdigest()[:16]
point_id2 = int(hash2, 16) % (10**7)

new_chunk_1 = {
    "text": f"### Document: MSAJCE Academic Programs | Section: 12 UG and 2 PG Degree Programs | Version: 2026-27\n{courses_text_1}",
    "raw_text": courses_text_1,
    "title": "MSAJCE Academic Programs & Degree Courses",
    "section_title": "12 UG and 2 PG Degree Programs Offered at MSAJCE",
    "source_file": "msajce_courses_overview.md",
    "url": "https://msajce-edu.in/courses.php",
    "category": "courses",
    "department": "Academics",
    "document_type": "markdown",
    "page_number": 1,
    "chunk_index": 1,
    "total_chunks": 2,
    "entities": ["12 UG programs", "2 PG programs", "B.E. CSE", "B.Tech IT", "B.Tech AI&DS", "B.Tech AI&ML", "M.E. CSE", "M.E. Structural"],
    "entity_ids": ["ent_courses_01"],
    "keywords": ["courses", "degree", "programs", "12 ug", "2 pg", "intake", "seats", "b.e", "b.tech", "m.e", "cse", "it", "ai", "ds", "cyber", "ece", "eee", "mech", "civil", "aiml", "csbs", "vlsi", "act"],
    "parent_id": parent_id,
    "chunk_hash": hash1,
    "scraped_at": "2026-09-05T00:00:00Z",
    "chunk_id": "msajce_courses_overview_001",
    "page_url": "https://msajce-edu.in/courses.php",
    "id": point_id1
}

new_chunk_2 = {
    "text": f"### Document: MSAJCE Academic Programs | Section: Course Intake & Degree Programs List | Version: 2026-27\n{courses_text_2}",
    "raw_text": courses_text_2,
    "title": "MSAJCE Academic Programs & Degree Courses",
    "section_title": "Course Intake & Degree Programs List",
    "source_file": "msajce_courses_overview.md",
    "url": "https://msajce-edu.in/courses.php",
    "category": "courses",
    "department": "Academics",
    "document_type": "markdown",
    "page_number": 1,
    "chunk_index": 2,
    "total_chunks": 2,
    "entities": ["12 UG programs", "2 PG programs"],
    "entity_ids": ["ent_courses_02"],
    "keywords": ["courses", "degree", "programs", "12 ug", "2 pg", "intake", "seats"],
    "parent_id": parent_id,
    "chunk_hash": hash2,
    "scraped_at": "2026-09-05T00:00:00Z",
    "chunk_id": "msajce_courses_overview_002",
    "page_url": "https://msajce-edu.in/courses.php",
    "id": point_id2
}

# Remove old versions if present and append
chunks = [c for c in chunks if c.get("source_file") != "msajce_courses_overview.md"]
chunks.append(new_chunk_1)
chunks.append(new_chunk_2)

with open(bm25_file, "w", encoding="utf-8") as f:
    json.dump(chunks, f, indent=2, ensure_ascii=False)

print(f"Successfully added 2 course chunks to {bm25_file}! Total chunks: {len(chunks)}")
