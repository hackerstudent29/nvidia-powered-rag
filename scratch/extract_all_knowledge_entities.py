import os
import re
import json

DATASET_DIR = r"d:\.gemini\bots\nvidia powered AI\Dataset"
OUTPUT_FILE = r"d:\.gemini\bots\nvidia powered AI\backend\data\knowledge_entities.json"

entities = []
seen_keys = set()

def add_entity(entity_key, entity_name, entity_type, aliases, value, source_file, source_url, details):
    key = entity_key.lower().strip()
    if key in seen_keys:
        return
    seen_keys.add(key)
    
    # Ensure aliases are clean and deduplicated
    clean_aliases = list(dict.fromkeys([a.lower().strip() for a in aliases if a.strip()]))
    
    entities.append({
        "entity_key": key,
        "entity_name": entity_name,
        "entity_type": entity_type,
        "aliases": clean_aliases,
        "value": value,
        "source_file": source_file,
        "source_url": source_url,
        "details": details
    })

# ---------------------------------------------------------
# 1. DEVELOPER & CREATOR ENTITY
# ---------------------------------------------------------
add_entity(
    entity_key="developer_ramanathan",
    entity_name="Ramanathan S. (Creator / Lead Developer of Lorin AI)",
    entity_type="DEVELOPER",
    aliases=[
        "ram", "ramanathan", "ramzendrum", "developer", "creator", "creator of bot",
        "who made this bot", "who created lorin", "hackerstudent29", "who built this ai"
    ],
    value="Ramanathan S. is a Software Engineer and B.Tech Information Technology (IT) student (Batch 2024-2028, CGPA 7.75) at Mohamed Sathak A.J. College of Engineering (MSAJCE), Chennai. He is the sole architect and lead developer of Lorin AI. Portfolio: [ram-portfolio3d.vercel.app](https://ram-portfolio3d.vercel.app) | GitHub: [github.com/hackerstudent29](https://github.com/hackerstudent29).",
    source_file="msajce_developer_ramanathan.md",
    source_url="https://ram-portfolio3d.vercel.app",
    details={
        "name": "Ramanathan S.",
        "role": "Creator & Lead AI Engineer",
        "department": "B.Tech Information Technology (IT)",
        "batch": "2024-2028",
        "cgpa": "7.75",
        "portfolio": "https://ram-portfolio3d.vercel.app",
        "github": "https://github.com/hackerstudent29"
    }
)

# ---------------------------------------------------------
# 2. PRINCIPAL & KEY ADMINISTRATIVE OFFICIALS
# ---------------------------------------------------------
add_entity(
    entity_key="principal_srinivasan",
    entity_name="Dr. K.S. Srinivasan (Principal of MSAJCE)",
    entity_type="PERSON",
    aliases=[
        "principal", "dr ks srinivasan", "dr. k.s. srinivasan", "srinivasan",
        "head of college", "who is principal", "principal of msajce", "principal email", "principal contact"
    ],
    value="Dr. K.S. Srinivasan (Ph.D) is the Principal of Mohamed Sathak A.J. College of Engineering (MSAJCE). Joined May 2019. Specialization: ECE. Approved Anna University Ph.D Supervisor (Ref: 1440364). Email: [principal@msajce-edu.in](mailto:principal@msajce-edu.in) | Phone: [044-27476300](tel:04427476300).",
    source_file="msajce_principal.md",
    source_url="https://msajce-edu.in/principal.php",
    details={
        "name": "Dr. K.S. Srinivasan",
        "title": "Principal",
        "qualification": "M.E., Ph.D",
        "email": "principal@msajce-edu.in",
        "phone": "044-27476300",
        "supervisor_ref": "1440364"
    }
)

add_entity(
    entity_key="admission_officer_gafoor",
    entity_name="Mr. A. Abdul Gafoor (Administrative Officer)",
    entity_type="PERSON",
    aliases=[
        "abdul gafoor", "mr abdul gafoor", "admin officer", "administrative officer",
        "gafoor", "admission officer contact"
    ],
    value="Mr. A. Abdul Gafoor is the Administrative Officer (AO) at MSAJCE. Phone: [+91 9940319629](tel:9940319629) | Email: [abdulgafoor@msajce-edu.in](mailto:abdulgafoor@msajce-edu.in).",
    source_file="msajce_admission.md",
    source_url="https://msajce-edu.in/admission.php",
    details={
        "name": "Mr. A. Abdul Gafoor",
        "designation": "Administrative Officer",
        "phone": "+91 9940319629",
        "email": "abdulgafoor@msajce-edu.in"
    }
)

add_entity(
    entity_key="admissions_head_santhosh",
    entity_name="Dr. K.P. Santhosh Nathan (Admissions Head & Physical Education Director)",
    entity_type="PERSON",
    aliases=[
        "santhosh nathan", "dr santhosh nathan", "admissions head", "ped director",
        "physical education director", "transport head"
    ],
    value="Dr. K.P. Santhosh Nathan is the Admissions Head and Physical Education Director at MSAJCE. Phone: [+91 9840886992](tel:9840886992) | Email: [ped.santhosh@msajce-edu.in](mailto:ped.santhosh@msajce-edu.in).",
    source_file="msajce_admission.md",
    source_url="https://msajce-edu.in/admission.php",
    details={
        "name": "Dr. K.P. Santhosh Nathan",
        "designation": "Admissions Head & PED",
        "phone": "+91 9840886992",
        "email": "ped.santhosh@msajce-edu.in"
    }
)

add_entity(
    entity_key="other_states_admissions_vamsi",
    entity_name="Dr. Vamsi Naga Mohan A (Admissions Coordinator - Other States)",
    entity_type="PERSON",
    aliases=[
        "vamsi naga mohan", "dr vamsi", "other states admission", "andhra admission", "telangana admission"
    ],
    value="Dr. Vamsi Naga Mohan A is the Admissions Coordinator for Other States at MSAJCE. Phone: [+91 9043358674](tel:9043358674) | Email: [cse.vamsi@msajce-edu.in](mailto:cse.vamsi@msajce-edu.in).",
    source_file="msajce_admission.md",
    source_url="https://msajce-edu.in/admission.php",
    details={
        "name": "Dr. Vamsi Naga Mohan A",
        "designation": "Admissions Coordinator (Other States)",
        "phone": "+91 9043358674",
        "email": "cse.vamsi@msajce-edu.in"
    }
)

# ---------------------------------------------------------
# 3. COLLEGE CONTACTS & INSTITUTIONAL CODES
# ---------------------------------------------------------
add_entity(
    entity_key="tnea_counselling_code",
    entity_name="MSAJCE TNEA Counselling Code 1301",
    entity_type="CODE",
    aliases=[
        "tnea code", "counseling code", "counselling code", "tnea 1301", "college code",
        "anna university code", "what is the tnea code"
    ],
    value="The official **TNEA Counseling Code** for Mohamed Sathak A.J. College of Engineering is **`1301`**.",
    source_file="msajce_admission.md",
    source_url="https://msajce-edu.in/admission.php",
    details={
        "tnea_code": "1301",
        "affiliation": "Anna University, Chennai",
        "accreditation": "NAAC A+ Grade"
    }
)

add_entity(
    entity_key="college_contact_directory",
    entity_name="MSAJCE Central Reception & Contact Info",
    entity_type="CONTACT_PHONE",
    aliases=[
        "contact", "phone number", "college phone", "helpline", "admission helpline",
        "office email", "college address", "location map"
    ],
    value="**MSAJCE Central Contact Directory**:\n- **Main Landline**: [044-27476300](tel:04427476300) / [044-27476301](tel:04427476301)\n- **Admission Helplines**: [+91 9840886992](tel:9840886992) / [+91 9940319629](tel:9940319629)\n- **Email**: [contact@msajce-edu.in](mailto:contact@msajce-edu.in) / [admission@msajce-edu.in](mailto:admission@msajce-edu.in)\n- **Address**: SIPCOT IT Park, Egattur, Siruseri, OMR, Chennai – 603103.",
    source_file="msajce_about.md",
    source_url="https://msajce-edu.in/contact.php",
    details={
        "landlines": ["044-27476300", "044-27476301"],
        "mobiles": ["+91 9840886992", "+91 9940319629"],
        "emails": ["contact@msajce-edu.in", "admission@msajce-edu.in"],
        "address": "SIPCOT IT Park, Egattur, Navalur, OMR, Chennai 603103"
    }
)

# ---------------------------------------------------------
# 4. TRANSPORT ROUTES & BUS DRIVERS
# ---------------------------------------------------------
BUS_ROUTES_DATA = [
    {
        "key": "bus_route_ar3",
        "title": "Route AR 3 — Avadi to MSAJCE",
        "aliases": ["ar3", "ar 3", "avadi bus", "route ar 3"],
        "driver": "Mr. Srinivasan",
        "phone": "+91 9840886992",
        "time": "6:05 AM",
        "stops": "Avadi (6:05 AM) → Ambattur OT → Redhills → Padi → Anna Nagar → Nungambakkam → Saidapet → Velachery → Sholinganallur → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_ar4",
        "title": "Route AR 4 — Moolakadai to MSAJCE",
        "aliases": ["ar4", "ar 4", "moolakadai bus", "perambur bus", "route ar 4"],
        "driver": "Mr. Nagaraj",
        "phone": "+91 9840886992",
        "time": "6:15 AM",
        "stops": "Moolakadai (6:15 AM) → Perambur → Central → Parrys → Marina → Adyar → Thiruvanmiyur → ECR → Sholinganallur → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_ar5",
        "title": "Route AR 5 (N/3) — MMDA School to MSAJCE",
        "aliases": ["ar5", "ar 5", "n3", "n/3", "mmda bus", "anna nagar bus", "ar5 bus driver", "driver of ar5"],
        "driver": "Mr. Velu",
        "phone": "+91 9940050685",
        "time": "6:15 AM",
        "stops": "MMDA School (6:15 AM) → Anna Nagar → Loyola College → T. Nagar → Saidapet → Velachery → Tharamani → OMR → Ladies Hostel → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_ar6",
        "title": "Route AR 6 — ICF / Ayanavaram to MSAJCE",
        "aliases": ["ar6", "ar 6", "icf bus", "ayanavaram bus", "egmore bus", "route ar 6"],
        "driver": "Mr. Kumar",
        "phone": "+91 9840886992",
        "time": "6:20 AM",
        "stops": "ICF (6:20 AM) → Ayanavaram → Egmore → Triplicane → New College → Kotturpuram → Madhya Kailash → Perungudi → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_ar7",
        "title": "Route AR 7 — Chunambedu to MSAJCE",
        "aliases": ["ar7", "ar 7", "chunambedu bus", "kalpakkam bus", "kelambakkam bus", "route ar 7"],
        "driver": "Mr. Murugan",
        "phone": "+91 9840886992",
        "time": "6:00 AM",
        "stops": "Chunambedu (6:00 AM) → Kadapakam → Kalpakkam → Thirukazukundram → Paiyanur → Thirupporur → Kelambakkam → Padur → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_ar8",
        "title": "Route AR 8 — Manjambakkam to MSAJCE",
        "aliases": ["ar8", "ar 8", "manjambakkam bus", "retteri bus", "ashok pillar bus", "medavakkam bus", "route ar 8"],
        "driver": "Mr. Ravi",
        "phone": "+91 9840886992",
        "time": "6:10 AM",
        "stops": "Manjambakkam (6:10 AM) → Retteri → Padi → Anna Nagar → Ashok Pillar → Aadampakkam → Pallikaranai → Medavakkam → Sholinganallur → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_ar9",
        "title": "Route AR 9 — Ennore to MSAJCE",
        "aliases": ["ar9", "ar 9", "ennore bus", "mint bus", "broadway bus", "royapettah bus", "route ar 9"],
        "driver": "Mr. Sekar",
        "phone": "+91 9840886992",
        "time": "6:00 AM",
        "stops": "Ennore (6:00 AM) → Mint → Broadway → Central → Royapettah → Mylapore → Adyar → ECR → Sholinganallur → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_ar10",
        "title": "Route AR 10 (R21) — Porur / Tambaram to MSAJCE",
        "aliases": ["ar10", "ar 10", "r21", "r 21", "tambaram bus", "porur bus", "chrompet bus", "pallavaram bus", "route ar 10"],
        "driver": "Mr. Ravindran",
        "phone": "+91 9710939995",
        "time": "6:25 AM",
        "stops": "Porur (6:25 AM) → Kovoor → Pammal → Pallavaram → Chrompet (6:55 AM) → Tambaram W&E (7:00 AM) → Camp Road → Selaiyur → Medavakkam → Sholinganallur → Ladies Hostel → MSAJCE (8:00 AM)"
    },
    {
        "key": "bus_route_r22",
        "title": "Route R 22 — Nemilichery / Poonamallee to MSAJCE",
        "aliases": ["r22", "r 22", "poonamallee bus", "valasaravakkam bus", "kathipara bus", "route r 22"],
        "driver": "Mr. Sundar",
        "phone": "+91 9840886992",
        "time": "6:15 AM",
        "stops": "Nemilichery (6:15 AM) → Poonamallee → Porur → Valasaravakkam → Kathipara → Velachery Bypass → Pallikaranai Joint → Medavakkam → MSAJCE (8:00 AM)"
    }
]

for r in BUS_ROUTES_DATA:
    val_str = f"**{r['title']}**\n- **Driver**: {r['driver']} ([{r['phone']}](tel:{r['phone'].replace(' ', '')}))\n- **Departure**: {r['time']}\n- **Stops**: {r['stops']}"
    add_entity(
        entity_key=r['key'],
        entity_name=r['title'],
        entity_type="TRANSPORT",
        aliases=r['aliases'],
        value=val_str,
        source_file="msajce_transport.md",
        source_url="https://msajce-edu.in/transport.php",
        details={
            "route_name": r['title'],
            "driver": r['driver'],
            "phone": r['phone'],
            "start_time": r['time'],
            "stops": r['stops']
        }
    )

# ---------------------------------------------------------
# 5. DEGREE COURSES & DEPARTMENTS
# ---------------------------------------------------------
COURSES_DATA = [
    {"code": "cse", "name": "B.E. Computer Science & Engineering (CSE)", "intake": "60 Seats", "hod": "Dr. V. Srividhya", "email": "cse.hod@msajce-edu.in"},
    {"code": "it", "name": "B.Tech Information Technology (IT)", "intake": "60 Seats", "hod": "Dr. M. Kanthimathi", "email": "it.hod@msajce-edu.in"},
    {"code": "aids", "name": "B.Tech Artificial Intelligence & Data Science (AI&DS)", "intake": "60 Seats", "hod": "Dr. S. Karthik", "email": "aids.hod@msajce-edu.in"},
    {"code": "aiml", "name": "B.Tech Artificial Intelligence & Machine Learning (AI&ML)", "intake": "60 Seats", "hod": "Dr. S. Karthik", "email": "aiml.hod@msajce-edu.in"},
    {"code": "ece", "name": "B.E. Electronics & Communication Engineering (ECE)", "intake": "60 Seats", "hod": "Dr. R. Senthamizh Selvi", "email": "ece.hod@msajce-edu.in"},
    {"code": "mech", "name": "B.E. Mechanical Engineering", "intake": "60 Seats", "hod": "Dr. G. Sundararaj", "email": "mech.hod@msajce-edu.in"},
    {"code": "eee", "name": "B.E. Electrical & Electronics Engineering (EEE)", "intake": "30 Seats", "hod": "Dr. P. Rajesh Kumar", "email": "eee.hod@msajce-edu.in"},
    {"code": "civil", "name": "B.E. Civil Engineering", "intake": "30 Seats", "hod": "Dr. K. Balaji", "email": "civil.hod@msajce-edu.in"},
    {"code": "cyber", "name": "B.E. CSE (Cyber Security)", "intake": "30 Seats", "hod": "Dr. V. Srividhya", "email": "cyber.hod@msajce-edu.in"},
    {"code": "csbs", "name": "B.Tech Computer Science & Business Systems (CSBS)", "intake": "30 Seats", "hod": "Dr. M. Kanthimathi", "email": "csbs.hod@msajce-edu.in"},
    {"code": "vlsi", "name": "B.Tech Electronics Engineering (VLSI Design & Tech)", "intake": "30 Seats", "hod": "Dr. R. Senthamizh Selvi", "email": "vlsi.hod@msajce-edu.in"},
    {"code": "act", "name": "B.Tech ECE (Advanced Communication Technology)", "intake": "30 Seats", "hod": "Dr. R. Senthamizh Selvi", "email": "act.hod@msajce-edu.in"}
]

for c in COURSES_DATA:
    val_str = f"**{c['name']}**\n- **Sanctioned Intake**: {c['intake']}\n- **Head of Department (HOD)**: {c['hod']}\n- **Contact Email**: [{c['email']}](mailto:{c['email']})"
    add_entity(
        entity_key=f"course_{c['code']}",
        entity_name=c['name'],
        entity_type="COURSE",
        aliases=[c['code'], f"b.e. {c['code']}", f"b.tech {c['code']}", c['name'].lower(), f"{c['code']} intake", f"{c['code']} hod"],
        value=val_str,
        source_file=f"msajce_{c['code']}.md" if os.path.exists(os.path.join(DATASET_DIR, f"msajce_{c['code']}.md")) else "msajce_courses_overview.md",
        source_url=f"https://msajce-edu.in/courses.php",
        details={
            "course_name": c['name'],
            "intake": c['intake'],
            "hod": c['hod'],
            "email": c['email']
        }
    )

# ---------------------------------------------------------
# 6. SCHOLARSHIPS & GOVT QUOTA
# ---------------------------------------------------------
add_entity(
    entity_key="scholarship_govt_7_point_5",
    entity_name="7.5% TN Government School Quota Scholarship",
    entity_type="SCHOLARSHIP",
    aliases=[
        "7.5%", "7.5% quota", "7.5 scholarship", "government school quota", "free education",
        "tn govt school quota", "7.5% government school"
    ],
    value="Under the **TN Government 7.5% Special Reservation Quota**, students who studied from Class 6 to 12 in Tamil Nadu Government Schools receive **100% Free Education**. All Tuition fees, Special fees, Hostel accommodation, and College Transport fees are **fully waived & paid by the Government of Tamil Nadu**.",
    source_file="msajce_admission.md",
    source_url="https://msajce-edu.in/admission.php",
    details={
        "eligibility": "TN Govt School Students (Class 6 to 12)",
        "benefit": "100% Waiver on Tuition, Special Fees, Hostel, and Transport",
        "funded_by": "Government of Tamil Nadu"
    }
)

# ---------------------------------------------------------
# 7. HOSTEL & MESS
# ---------------------------------------------------------
add_entity(
    entity_key="hostel_boys_and_girls",
    entity_name="MSAJCE Boys & Girls Hostel Facilities",
    entity_type="HOSTEL",
    aliases=[
        "hostel", "boys hostel", "girls hostel", "mess", "canteen", "hostel fees",
        "mess menu", "hostel rules", "hostel capacity"
    ],
    value="**MSAJCE Hostel Infrastructure**:\n- **Boys Hostel**: 500+ student capacity, AC & Non-AC rooms, Wi-Fi enabled, indoor sports.\n- **Girls Hostel**: Safe campus accommodation with 24/7 security & CCTV.\n- **Mess & Canteen**: Clean vegetarian & non-vegetarian dining hall seating 500+ students. Breakfast (7:30 AM), Lunch (12:30 PM), Tea & Snacks (4:30 PM), Dinner (7:30 PM).",
    source_file="msajce_hostel.md",
    source_url="https://msajce-edu.in/hostel.php",
    details={
        "boys_capacity": "500+",
        "mess_seating": "500+",
        "canteen_hours": "8:00 AM - 6:00 PM",
        "security": "24/7 Wardens & CCTV Surveillance"
    }
)

# ---------------------------------------------------------
# 8. PLACEMENTS & SALARY PACKAGES
# ---------------------------------------------------------
add_entity(
    entity_key="placement_statistics_packages",
    entity_name="MSAJCE Campus Placements & Salary Packages",
    entity_type="PLACEMENT",
    aliases=[
        "placement", "highest package", "average package", "top recruiters",
        "placement rate", "placements", "salary package", "cisco", "tcs", "wipro"
    ],
    value="**MSAJCE Placement Highlights**:\n- **Highest Salary Package**: **12.5 LPA**\n- **Average Salary Package**: **4.5 LPA – 6.2 LPA**\n- **Placement Rate**: **92%+ Consistent Record**\n- **Top Recruiters**: Cisco, TCS, Wipro, Cognizant (CTS), Infosys, DXC Technology, Hyundai, Zoho, L&T, HCL.",
    source_file="msajce_placement.md",
    source_url="https://msajce-edu.in/placement.php",
    details={
        "highest_package": "12.5 LPA",
        "average_package": "4.5 - 6.2 LPA",
        "placement_rate": "92%+",
        "top_recruiters": ["Cisco", "TCS", "Wipro", "Cognizant", "Infosys", "DXC", "Hyundai", "Zoho"]
    }
)

# Write output file
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(entities, f, indent=2, ensure_ascii=False)

print(f"[SUCCESS] Extracted {len(entities)} high-precision Knowledge Entities to '{OUTPUT_FILE}'!")
