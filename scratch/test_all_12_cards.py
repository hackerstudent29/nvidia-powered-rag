import requests
import json

url = "http://localhost:8000/api/chat"

test_prompts = [
    ("1. Admission", "What are the admission criteria, pathways, TNEA code, and document requirements for MSAJCE?"),
    ("2. Courses Offered", "What are all the 12 UG & 2 PG degree courses, intake capacity, and departments offered at MSAJCE?"),
    ("3. Campus Placements", "Who are the top recruiters, placement statistics, and highest salary package at MSAJCE?"),
    ("4. Scholarships", "What scholarships, including government aid, 7.5% quota, and merit schemes, are available at MSAJCE?"),
    ("5. Boys Hostel", "What are the hostel facilities, room capacity, mess menu, and rules for the Boys Hostel at MSAJCE?"),
    ("6. Girls Hostel", "What safety features, capacity, room amenities, and location details apply to the Girls Hostel at MSAJCE?"),
    ("7. Bus Routes", "What are the college bus routes, pickup points, timings, and transport coverage for MSAJCE?"),
    ("8. Mess & Canteen", "What is the mess food menu, dining hall capacity, canteen facilities, and timings at MSAJCE?"),
    ("9. Central Library", "Tell me about the Central Library facilities, book collection, digital library, and working hours at MSAJCE."),
    ("10. Lab Facilities", "What engineering lab facilities, computer centers, and specialized workshops are available at MSAJCE?"),
    ("11. Campus Life", "What sports facilities, athletic infrastructure, and student clubs are active at MSAJCE?"),
    ("12. Contact Info", "What is the official contact info, phone numbers, email addresses, and location map for MSAJCE?")
]

results = []

for name, prompt in test_prompts:
    payload = {"message": prompt, "session_id": f"test_card_{name.replace(' ', '_')}"}
    headers = {"Content-Type": "application/json"}
    try:
        res = requests.post(url, json=payload, headers=headers)
        data = res.json()
        resp_text = data.get("response", "")
        cached = data.get("cached", False)
        status = "OK" if len(resp_text) > 100 else "SHORT/EMPTY"
        results.append(f"{name}: STATUS={status} (cached={cached}, len={len(resp_text)})\n  Snippet: {resp_text[:120]}...\n")
    except Exception as e:
        results.append(f"{name}: ERROR={e}\n")

with open("scratch/test_all_12_cards_results.txt", "w", encoding="utf-8") as f:
    f.writelines(results)

print("ALL 12 CARDS TEST COMPLETE! Results saved to scratch/test_all_12_cards_results.txt")
