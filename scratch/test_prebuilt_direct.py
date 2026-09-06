import sys
import os

sys.path.append(os.path.abspath("backend"))
from server import PREBUILT_CARD_ANSWERS, get_prebuilt_card_answer

cards_to_check = [
    "What are the admission criteria, pathways, TNEA code, and document requirements for MSAJCE?",
    "What are all the 12 UG & 2 PG degree courses, intake capacity, and departments offered at MSAJCE?",
    "Who are the top recruiters, placement statistics, and highest salary package at MSAJCE?",
    "What scholarships, including government aid, 7.5% quota, and merit schemes, are available at MSAJCE?",
    "What are the hostel facilities, room capacity, mess menu, and rules for the Boys Hostel at MSAJCE?",
    "What safety features, capacity, room amenities, and location details apply to the Girls Hostel at MSAJCE?",
    "What are the college bus routes, pickup points, timings, and transport coverage for MSAJCE?",
    "What is the mess food menu, dining hall capacity, canteen facilities, and timings at MSAJCE?",
    "Tell me about the Central Library facilities, book collection, digital library, and working hours at MSAJCE.",
    "What engineering lab facilities, computer centers, and specialized workshops are available at MSAJCE?",
    "What sports facilities, athletic infrastructure, and student clubs are active at MSAJCE?",
    "What is the official contact info, phone numbers, email addresses, and location map for MSAJCE?"
]

print("=== TESTING PREBUILT MATCHES DIRECTLY ===")
success_count = 0

for idx, q in enumerate(cards_to_check, 1):
    res = get_prebuilt_card_answer(q)
    if res:
        print(f"Card {idx}: MATCH SUCCESS! (Title: {res['response'].splitlines()[0]})")
        success_count += 1
    else:
        print(f"Card {idx}: FAILED TO MATCH query: '{q}'")

print(f"\nTOTAL MATCHES: {success_count} / {len(cards_to_check)}")
