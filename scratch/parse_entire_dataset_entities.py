import os
import re
import json

DATASET_DIR = r"d:\.gemini\bots\nvidia powered AI\Dataset"
OUTPUT_FILE = r"d:\.gemini\bots\nvidia powered AI\backend\data\knowledge_entities.json"

# Load existing entities
existing_entities = []
if os.path.exists(OUTPUT_FILE):
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing_entities = json.load(f)
    except Exception:
        pass

seen_keys = {e["entity_key"].lower(): e for e in existing_entities}

def add_entity(entity_key, entity_name, entity_type, aliases, value, source_file, source_url, details):
    key = entity_key.lower().strip()
    clean_aliases = list(dict.fromkeys([a.lower().strip() for a in aliases if a.strip()]))
    
    entity_obj = {
        "entity_key": key,
        "entity_name": entity_name,
        "entity_type": entity_type,
        "aliases": clean_aliases,
        "value": value,
        "source_file": source_file,
        "source_url": source_url,
        "details": details
    }
    seen_keys[key] = entity_obj

# ---------------------------------------------------------
# Scan all Markdown files in Dataset/
# ---------------------------------------------------------
for filename in os.listdir(DATASET_DIR):
    if not filename.endswith(".md"):
        continue
        
    filepath = os.path.join(DATASET_DIR, filename)
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # 1. Extract Faculty / Staff / Contact Profiles
    # Pattern: Name, Designation, Email, Qualification
    faculty_matches = re.findall(r'(?:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+[A-Za-z\.\s]+', content)
    
    # 2. Extract Committees & Cells
    if "committee" in filename.lower() or "cell" in filename.lower() or "board" in filename.lower():
        cell_name = filename.replace("msajce_", "").replace(".md", "").upper()
        first_line = content.split("\n")[0].replace("#", "").strip() if content else cell_name
        summary_snippet = content[:350].strip().replace("\n", " ")
        add_entity(
            entity_key=f"committee_{filename.replace('msajce_', '').replace('.md', '')}",
            entity_name=f"MSAJCE {first_line}",
            entity_type="COMMITTEE",
            aliases=[cell_name.lower(), first_line.lower(), f"{cell_name.lower()} committee", f"{cell_name.lower()} cell"],
            value=f"**{first_line}** at MSAJCE:\n\n{summary_snippet}...",
            source_file=filename,
            source_url="https://msajce-edu.in",
            details={"committee_name": first_line, "source_file": filename}
        )

    # 3. Extract Clubs & Societies
    if "club" in filename.lower() or "society" in filename.lower() or "societies" in filename.lower():
        club_title = filename.replace("msajce_", "").replace(".md", "").replace("_", " ").title()
        snippet = content[:350].strip().replace("\n", " ")
        add_entity(
            entity_key=f"club_{filename.replace('msajce_', '').replace('.md', '')}",
            entity_name=f"MSAJCE {club_title}",
            entity_type="CLUB",
            aliases=[club_title.lower(), f"{club_title.lower()} club", f"msajce {club_title.lower()}"],
            value=f"**{club_title}** at MSAJCE:\n\n{snippet}...",
            source_file=filename,
            source_url="https://msajce-edu.in",
            details={"club_name": club_title, "source_file": filename}
        )

    # 4. Extract SIPCOT IT Companies
    if "sipcot" in filename.lower():
        companies = re.findall(r'\|\s*([A-Za-z0-9\s\.\&\,\-]+?)\s*\|', content)
        comp_list = [c.strip() for c in companies if c.strip() and not c.strip().startswith("-") and not c.strip().lower().startswith("company")]
        if comp_list:
            comp_str = ", ".join(comp_list[:15])
            add_entity(
                entity_key="sipcot_it_park_companies",
                entity_name="Companies in SIPCOT IT Park Siruseri (Near MSAJCE)",
                entity_type="LOCATION",
                aliases=["sipcot companies", "companies near msajce", "companies in siruseri", "sipcot it park"],
                value=f"**Major Corporate Tech Companies in SIPCOT IT Park, Siruseri** (located adjacent to MSAJCE campus):\n\n{comp_str}.",
                source_file=filename,
                source_url="https://msajce-edu.in",
                details={"companies_sample": comp_list[:15]}
            )

final_entities = list(seen_keys.values())

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(final_entities, f, indent=2, ensure_ascii=False)

print(f"[SUCCESS] Expanded Knowledge Base to {len(final_entities)} total precision entities in '{OUTPUT_FILE}'!")
