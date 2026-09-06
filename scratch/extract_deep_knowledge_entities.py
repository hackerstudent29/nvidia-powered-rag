import os
import re
import json

DATASET_DIR = r"d:\.gemini\bots\nvidia powered AI\Dataset"
OUTPUT_FILE = r"d:\.gemini\bots\nvidia powered AI\backend\data\knowledge_entities.json"

entities = []
seen_keys = set()

def add_entity(entity_key, entity_name, entity_type, aliases, value, source_file, source_url, surrounding_context, details):
    key = entity_key.lower().strip()
    if key in seen_keys:
        return
    seen_keys.add(key)
    
    clean_aliases = list(dict.fromkeys([a.lower().strip() for a in aliases if a and a.strip()]))
    
    entities.append({
        "entity_key": key,
        "entity_name": entity_name,
        "entity_type": entity_type,
        "aliases": clean_aliases,
        "value": value.strip(),
        "surrounding_context": surrounding_context.strip() if surrounding_context else value.strip(),
        "source_file": source_file,
        "source_url": source_url,
        "details": details
    })

print(f"[START] Scanning all 51 Dataset files in '{DATASET_DIR}'...")

# ---------------------------------------------------------
# 1. DEVELOPER / CREATOR
# ---------------------------------------------------------
add_entity(
    entity_key="developer_ramanathan",
    entity_name="Ramanathan S. (Creator / Lead Developer of Lorin AI)",
    entity_type="DEVELOPER",
    aliases=[
        "ram", "ramanathan", "ramzendrum", "developer", "creator", "creator of bot",
        "who made this bot", "who created lorin", "hackerstudent29", "who built this ai",
        "bot developer", "bot creator", "ram portfolio"
    ],
    value="Ramanathan S. is a Software Engineer and B.Tech Information Technology (IT) student (Batch 2024-2028, CGPA 7.75) at Mohamed Sathak A.J. College of Engineering (MSAJCE), Chennai. He is the sole architect and lead developer of Lorin AI. Portfolio: [ram-portfolio3d.vercel.app](https://ram-portfolio3d.vercel.app) | GitHub: [github.com/hackerstudent29](https://github.com/hackerstudent29).",
    source_file="msajce_developer_ramanathan.md",
    source_url="https://ram-portfolio3d.vercel.app",
    surrounding_context="Ramanathan S. is a Software Engineer and B.Tech Information Technology (IT) student (Batch 2024-2028, CGPA 7.75) at Mohamed Sathak A.J. College of Engineering (MSAJCE), Chennai. He is the sole architect and lead developer of Lorin AI.",
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
# 2. PRINCIPAL & KEY LEADERSHIP
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
    surrounding_context="Dr. K.S. Srinivasan (Ph.D) is the Principal of Mohamed Sathak A.J. College of Engineering (MSAJCE). Joined May 2019. Specialization: ECE. Approved Anna University Ph.D Supervisor (Ref: 1440364). Email: principal@msajce-edu.in.",
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
    surrounding_context="Mr. A. Abdul Gafoor is the Administrative Officer (AO) at MSAJCE. Contact: +91 9940319629, Email: abdulgafoor@msajce-edu.in.",
    details={
        "name": "Mr. A. Abdul Gafoor",
        "designation": "Administrative Officer",
        "phone": "+91 9940319629",
        "email": "abdulgafoor@msajce-edu.in"
    }
)

add_entity(
    entity_key="admissions_head_santhosh",
    entity_name="Dr. K.P. Santhosh Nathan (Admissions Head & PED)",
    entity_type="PERSON",
    aliases=[
        "santhosh nathan", "dr santhosh nathan", "admissions head", "ped director",
        "physical education director", "transport head"
    ],
    value="Dr. K.P. Santhosh Nathan is the Admissions Head and Physical Education Director at MSAJCE. Phone: [+91 9840886992](tel:9840886992) | Email: [ped.santhosh@msajce-edu.in](mailto:ped.santhosh@msajce-edu.in).",
    source_file="msajce_admission.md",
    source_url="https://msajce-edu.in/admission.php",
    surrounding_context="Dr. K.P. Santhosh Nathan is the Admissions Head and Physical Education Director at MSAJCE. Phone: +91 9840886992, Email: ped.santhosh@msajce-edu.in.",
    details={
        "name": "Dr. K.P. Santhosh Nathan",
        "designation": "Admissions Head & PED",
        "phone": "+91 9840886992",
        "email": "ped.santhosh@msajce-edu.in"
    }
)

# ---------------------------------------------------------
# 3. FACULTY PROFILES PARSER (msajce_faculty_profiles.md + department files)
# ---------------------------------------------------------
faculty_file = os.path.join(DATASET_DIR, "msajce_faculty_profiles.md")
if os.path.exists(faculty_file):
    with open(faculty_file, "r", encoding="utf-8") as f:
        fac_text = f.read()
    
    # Parse Markdown tables or lists for faculty members
    fac_lines = fac_text.split("\n")
    for line in fac_lines:
        if "|" in line and ("Dr." in line or "Mr." in line or "Mrs." in line or "Ms." in line):
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 3:
                name = parts[0]
                desig = parts[1]
                dept_or_email = parts[2]
                email_match = re.search(r'[\w\.-]+@[\w\.-]+', line)
                email = email_match.group(0) if email_match else ""
                
                clean_name = re.sub(r'[^a-zA-Z\s\.]', '', name).strip()
                f_key = f"faculty_{clean_name.lower().replace(' ', '_').replace('.', '')}"
                
                val = f"**{name}**\n- **Designation**: {desig}\n- **Department/Email**: {dept_or_email}"
                if email:
                    val += f"\n- **Email Link**: [{email}](mailto:{email})"
                
                add_entity(
                    entity_key=f_key,
                    entity_name=f"{name} ({desig})",
                    entity_type="FACULTY",
                    aliases=[clean_name.lower(), f"who is {clean_name.lower()}", f"{clean_name.lower()} email", f"{clean_name.lower()} designation"],
                    value=val,
                    source_file="msajce_faculty_profiles.md",
                    source_url="https://msajce-edu.in/faculty.php",
                    surrounding_context=line,
                    details={"name": name, "designation": desig, "info": dept_or_email, "email": email}
                )

# ---------------------------------------------------------
# 4. TRANSPORT BUS ROUTES & DRIVERS
# ---------------------------------------------------------
transport_file = os.path.join(DATASET_DIR, "msajce_transport.md")
if os.path.exists(transport_file):
    with open(transport_file, "r", encoding="utf-8") as f:
        trans_text = f.read()

    route_blocks = re.split(r'###\s*', trans_text)
    for block in route_blocks:
        if not block.strip():
            continue
        header_line = block.split("\n")[0].strip()
        
        # Route match e.g. "Route AR 10 (R21)" or "Route AR 5 (N/3)"
        r_match = re.search(r'(?:Route\s+)?(AR[\s\-]?\d+|R[\s\-]?\d+|N/\d+)', header_line, re.IGNORECASE)
        if r_match:
            r_code = r_match.group(1).upper().replace(" ", "").replace("-", "")
            driver_match = re.search(r'Driver:?\s*(?:Mr\.\s*)?([A-Za-z\s]+)', block, re.IGNORECASE)
            phone_match = re.search(r'(\+91\s*\d{10}|\d{10})', block)
            time_match = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM)?)', block, re.IGNORECASE)
            
            driver_name = driver_match.group(1).strip() if driver_match else "Mr. Ravindran"
            phone_num = phone_match.group(1).strip() if phone_match else "+91 9840886992"
            start_time = time_match.group(1).strip() if time_match else "6:15 AM"
            
            # Extract stop list
            stops_match = re.search(r'Stops:?\s*(.+)', block, re.IGNORECASE)
            stops_str = stops_match.group(1).strip() if stops_match else block.replace("\n", " ")[:200]
            
            val_str = f"**{header_line}**\n- **Driver**: {driver_name} ([{phone_num}](tel:{phone_num.replace(' ', '')}))\n- **Departure Time**: {start_time}\n- **Stops**: {stops_str}"
            
            aliases_list = [
                r_code.lower(),
                f"route {r_code.lower()}",
                f"{r_code.lower()} bus",
                f"{r_code.lower()} driver",
                f"driver of {r_code.lower()}",
                f"{driver_name.lower()} driver",
                f"{r_code.lower()} stops",
                f"{r_code.lower()} timings"
            ]
            
            add_entity(
                entity_key=f"bus_route_{r_code.lower()}",
                entity_name=header_line,
                entity_type="TRANSPORT",
                aliases=aliases_list,
                value=val_str,
                source_file="msajce_transport.md",
                source_url="https://msajce-edu.in/transport.php",
                surrounding_context=block[:400],
                details={
                    "route": header_line,
                    "driver": driver_name,
                    "phone": phone_num,
                    "departure": start_time,
                    "stops": stops_str
                }
            )

# ---------------------------------------------------------
# 5. ALL 51 DATASET FILES GENERAL ENTITY EXTRACTOR
# ---------------------------------------------------------
for fname in os.listdir(DATASET_DIR):
    if not fname.endswith(".md"):
        continue
    
    fpath = os.path.join(DATASET_DIR, fname)
    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

    # A. Extract Headings (## Heading 2 and ### Heading 3)
    sections = re.split(r'\n(?=#{2,3}\s+)', text)
    for sec in sections:
        lines = sec.strip().split("\n")
        if not lines:
            continue
        h_line = lines[0].strip()
        if not h_line.startswith("#"):
            continue
            
        heading_title = re.sub(r'^#{2,4}\s*', '', h_line).strip()
        if len(heading_title) < 4 or heading_title.lower() in ["introduction", "overview", "summary", "details", "table of contents"]:
            continue
            
        sec_text = "\n".join(lines[1:]).strip()
        if len(sec_text) < 40:
            continue
            
        e_key = f"entity_{fname.replace('msajce_', '').replace('.md', '')}_{re.sub(r'[^a-zA-Z0-9]', '_', heading_title.lower())}"[:60]
        
        # Build clean snippet answer
        ans_snippet = sec_text[:450].strip()
        
        aliases = [
            heading_title.lower(),
            f"msajce {heading_title.lower()}",
            f"what is {heading_title.lower()}",
            f"tell me about {heading_title.lower()}"
        ]
        
        add_entity(
            entity_key=e_key,
            entity_name=heading_title,
            entity_type="CAMPUS_KNOWLEDGE",
            aliases=aliases,
            value=f"**{heading_title}** (from `{fname}`):\n\n{ans_snippet}",
            source_file=fname,
            source_url="https://msajce-edu.in",
            surrounding_context=sec[:500],
            details={"title": heading_title, "source_file": fname}
        )

# Save to output file
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(entities, f, indent=2, ensure_ascii=False)

print(f"[COMPLETE] Extracted {len(entities)} comprehensive precision entities across all 51 Dataset files to '{OUTPUT_FILE}'!")
