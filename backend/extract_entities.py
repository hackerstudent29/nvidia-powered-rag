import os
import sys
import glob
import json
import re
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
ENTITIES_OUTPUT_FILE = os.path.join(BACKEND_DIR, "data", "knowledge_entities.json")
PAGES_LINK_FILE = os.path.join(DATASET_DIR, "links folder", "pageslink.md")

dotenv_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Load page links mapping
def load_page_links():
    mapping = {}
    if os.path.exists(PAGES_LINK_FILE):
        with open(PAGES_LINK_FILE, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        for i in range(len(lines)):
            if lines[i].endswith(".md"):
                doc_name = lines[i]
                topic_title = lines[i+1] if i+1 < len(lines) else doc_name
                url = lines[i+2] if i+2 < len(lines) and ("http" in lines[i+2] or ".in" in lines[i+2] or ".app" in lines[i+2]) else ""
                if not url.startswith("http") and url:
                    url = "https://" + url
                mapping[doc_name] = {"topic_title": topic_title, "url": url}
    return mapping


def extract_all_entities():
    print("=" * 70, flush=True)
    print("🔍 LORIN AI - COMPREHENSIVE KNOWLEDGE ENTITY EXTRACTION & INDEXING", flush=True)
    print("=" * 70, flush=True)

    page_links = load_page_links()
    md_files = glob.glob(os.path.join(DATASET_DIR, "*.md"))
    print(f"Found {len(md_files)} knowledge markdown documents in Dataset/", flush=True)

    entities = []

    # 1. SPECIAL HARDCODED & VERIFIED ENTITIES (High priority ground truth)
    # Developer Entity
    entities.append({
        "entity_key": "developer_ramanathan",
        "entity_name": "Ramanathan S. (Creator / Developer of Lorin AI)",
        "entity_type": "DEVELOPER",
        "aliases": ["ram", "ramanathan", "ramzendrum", "developer", "creator of bot", "who made this bot", "who created lorin", "hackerstudent29"],
        "value": "Ramanathan S. is a Software Engineer, B.Tech Information Technology (IT) student (Batch 2024-2028, CGPA 7.75) at Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA), Chennai. He is the sole architect and lead developer of the Lorin AI Campus Chatbot. Personal Portfolio: https://ram-portfolio3d.vercel.app | GitHub: https://github.com/hackerstudent29",
        "source_file": "msajcea_developer_ramanathan.md",
        "source_url": "https://ram-portfolio3d.vercel.app",
        "details": {
            "name": "Ramanathan S.",
            "role": "Creator & Lead Backend/AI Engineer of Lorin AI Bot",
            "department": "B.Tech Information Technology (IT)",
            "batch": "2024-2028",
            "cgpa": "7.75",
            "college": "Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA)",
            "skills": ["Java", "Spring Boot", "PostgreSQL", "React", "TypeScript", "NVIDIA NIM", "Qdrant", "RAG Architecture"],
            "portfolio": "https://ram-portfolio3d.vercel.app",
            "github": "https://github.com/hackerstudent29"
        }
    })

    # Principal Entity
    entities.append({
        "entity_key": "principal_srinivasan",
        "entity_name": "Dr. K.S. Srinivasan (Principal of MSAJCEA)",
        "entity_type": "PERSON",
        "aliases": ["principal", "dr ks srinivasan", "dr. k.s. srinivasan", "srinivasan", "head of college"],
        "value": "Dr. K.S. Srinivasan (Ph.D) is the Principal of Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA), Siruseri, Chennai. Email: [principal@msajce-edu.in](mailto:principal@msajce-edu.in). He specializes in Electronics and Communication Engineering and Anna University Ph.D Supervisor (Ref: 1440364).",
        "source_file": "msajcea_principal.md",
        "source_url": "https://msajce-edu.in/principal.php",
        "details": {
            "name": "Dr. K.S. Srinivasan",
            "designation": "Principal",
            "qualification": "Ph.D",
            "email": "principal@msajce-edu.in",
            "supervisor_id": "1440364",
            "roles": ["Principal", "Chairman Academic Advisory Committee", "Chairman Anti-Ragging Committee", "IQAC Chairperson"]
        }
    })

    # Core Institutional Contacts & Numbers
    entities.append({
        "entity_key": "contact_college_helpline",
        "entity_name": "MSAJCEA Official Contact Numbers & Office",
        "entity_type": "CONTACT_PHONE",
        "aliases": ["phone", "phone number", "contact number", "college phone", "helpline", "admission phone", "contact us"],
        "value": "MSAJCEA Campus Contact Numbers: Phone: [044-27476300](tel:04427476300), Mobile: [+91 9444103328](tel:+919444103328), Admission Helpline: [+91 9940004500](tel:+919940004500). Email: [admission@msajce-edu.in](mailto:admission@msajce-edu.in) / [info@msajce-edu.in](mailto:info@msajce-edu.in)",
        "source_file": "msajcea_about.md",
        "source_url": "https://msajce-edu.in/contact.php",
        "details": {
            "landline": "044-27476300",
            "mobile": "+91 9444103328",
            "admission_helpline": "+91 9940004500",
            "email": "admission@msajce-edu.in"
        }
    })

    # TNEA Counselling Code
    entities.append({
        "entity_key": "tnea_counselling_code",
        "entity_name": "MSAJCEA TNEA Counselling Code",
        "entity_type": "COURSE",
        "aliases": ["tnea code", "counselling code", "college code", "tnea counselling code", "anna university code"],
        "value": "The TNEA Counselling Code for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA) is **1301**.",
        "source_file": "msajcea_admission.md",
        "source_url": "https://msajce-edu.in/admission.php",
        "details": {
            "tnea_code": "1301",
            "college": "Mohamed Sathak A.J. College of Engineering and Architecture"
        }
    })

    # Transport & Bus Route Entities
    transport_routes = [
        {"route": "Velachery Bus Route / MTC", "aliases": ["velachery bus", "which bus goes velachery", "bus to velachery", "velachery route", "51", "21g"], "details": "Buses connecting Velachery to MSAJCEA (Siruseri / SIPCOT): MTC Route **51G**, **102**, **570**, **515**, or College Bus Route No. 4 (Velachery -> Guindy -> College). Campus is at SIPCOT IT Park, Siruseri, OMR Chennai."},
        {"route": "Tambaram Bus Route", "aliases": ["tambaram bus", "bus to tambaram", "tambaram route", "515"], "details": "Buses connecting Tambaram to MSAJCEA: MTC Route **515**, **555**, or College Bus Route No. 2 (Tambaram -> Chromepet -> College)."},
        {"route": "Guindy Bus Route", "aliases": ["guindy bus", "bus to guindy", "guindy route", "102"], "details": "Buses connecting Guindy to MSAJCEA: MTC Route **102**, **570**, **19B**, or College Bus Route No. 5."},
        {"route": "Broadway / Central Bus Route", "aliases": ["broadway bus", "central bus", "bus to central", "102x"], "details": "Buses connecting Broadway / Chennai Central to MSAJCEA: MTC Route **102**, **102X**, **570** along OMR expressway to Siruseri."},
    ]
    for tr in transport_routes:
        entities.append({
            "entity_key": f"transport_{re.sub(r'[^a-z0-9]', '_', tr['route'].lower())}",
            "entity_name": tr["route"],
            "entity_type": "TRANSPORT",
            "aliases": tr["aliases"],
            "value": tr["details"],
            "source_file": "msajcea_transport.md",
            "source_url": "https://msajce-edu.in/transport.php",
            "details": {"route": tr["route"], "description": tr["details"]}
        })

    # 2. DYNAMIC REGEX & MARKDOWN EXTRACTION ACROSS ALL 51 MD FILES
    email_regex = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
    phone_regex = re.compile(r'(?:\+91[\s-]?)?(?:044[\s-]?)?\d{4}[\s-]?\d{4}|\b9\d{9}\b|\b044-?\d{8}\b')
    url_regex = re.compile(r'https?://[^\s\)]+')

    for file_path in md_files:
        filename = os.path.basename(file_path)
        doc_info = page_links.get(filename, {})
        source_url = doc_info.get("url", "https://msajce-edu.in")
        topic_title = doc_info.get("topic_title", filename.replace(".md", "").replace("_", " ").title())

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # Extract Emails as Entities
        emails = list(set(email_regex.findall(content)))
        for em in emails:
            e_key = f"email_{re.sub(r'[^a-z0-9]', '_', em.lower())}"
            if not any(e["entity_key"] == e_key for e in entities):
                entities.append({
                    "entity_key": e_key,
                    "entity_name": f"Email: {em} ({topic_title})",
                    "entity_type": "CONTACT_EMAIL",
                    "aliases": [em.lower(), f"{topic_title.lower()} email", "email", "contact email"],
                    "value": f"Official Email for {topic_title}: [{em}](mailto:{em})",
                    "source_file": filename,
                    "source_url": source_url,
                    "details": {"email": em, "topic": topic_title}
                })

        # Extract Phone Numbers as Entities
        phones = list(set(phone_regex.findall(content)))
        for ph in phones:
            clean_digits = re.sub(r'[^\d+]', '', ph)
            if len(clean_digits) >= 8:
                p_key = f"phone_{re.sub(r'[^a-z0-9]', '_', clean_digits)}"
                if not any(e["entity_key"] == p_key for e in entities):
                    entities.append({
                        "entity_key": p_key,
                        "entity_name": f"Phone: {ph} ({topic_title})",
                        "entity_type": "CONTACT_PHONE",
                        "aliases": [ph.lower(), clean_digits, f"{topic_title.lower()} phone", "phone", "mobile"],
                        "value": f"Contact Number for {topic_title}: [{ph}](tel:{clean_digits})",
                        "source_file": filename,
                        "source_url": source_url,
                        "details": {"phone": ph, "digits": clean_digits, "topic": topic_title}
                    })

        # Extract URLs as Entities
        urls = list(set(url_regex.findall(content)))
        for u in urls:
            u_clean = u.rstrip(".,)")
            u_key = f"url_{hash(u_clean) & 0xFFFFFFFF}"
            if not any(e["entity_key"] == u_key for e in entities):
                entities.append({
                    "entity_key": u_key,
                    "entity_name": f"Link: {u_clean} ({topic_title})",
                    "entity_type": "RESOURCE_LINK",
                    "aliases": [u_clean.lower(), f"{topic_title.lower()} link"],
                    "value": f"Verified Resource Link for {topic_title}: [{u_clean}]({u_clean})",
                    "source_file": filename,
                    "source_url": u_clean,
                    "details": {"url": u_clean, "topic": topic_title}
                })

    print(f"✅ Total Extracted Structured Knowledge Entities: {len(entities)}", flush=True)

    # 3. SAVE TO LOCAL FAST JSON FILE
    os.makedirs(os.path.dirname(ENTITIES_OUTPUT_FILE), exist_ok=True)
    with open(ENTITIES_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(entities, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved local JSON entities index -> {ENTITIES_OUTPUT_FILE}", flush=True)

    # 4. STORE IN NEON POSTGRES DATABASE (Optional / Cloud Sync)
    if DATABASE_URL:
        print("\n🗄️ Syncing Knowledge Entities into Neon Serverless PostgreSQL...", flush=True)
        try:
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=2)
            cur = conn.cursor()

            # Create table if not exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_entities (
                    id SERIAL PRIMARY KEY,
                    entity_key VARCHAR(255) UNIQUE NOT NULL,
                    entity_name TEXT NOT NULL,
                    entity_type VARCHAR(50) NOT NULL,
                    aliases TEXT[] NOT NULL,
                    value TEXT NOT NULL,
                    source_file VARCHAR(255),
                    source_url TEXT,
                    details JSONB NOT NULL DEFAULT '{}'::jsonb,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()

            from psycopg2.extras import execute_values
            # Batch upsert entities
            upsert_query = """
                INSERT INTO knowledge_entities (entity_key, entity_name, entity_type, aliases, value, source_file, source_url, details, updated_at)
                VALUES %s
                ON CONFLICT (entity_key) DO UPDATE SET
                    entity_name = EXCLUDED.entity_name,
                    entity_type = EXCLUDED.entity_type,
                    aliases = EXCLUDED.aliases,
                    value = EXCLUDED.value,
                    source_file = EXCLUDED.source_file,
                    source_url = EXCLUDED.source_url,
                    details = EXCLUDED.details,
                    updated_at = CURRENT_TIMESTAMP;
            """

            data_tuples = [
                (
                    ent["entity_key"],
                    ent["entity_name"],
                    ent["entity_type"],
                    ent["aliases"],
                    ent["value"],
                    ent["source_file"],
                    ent["source_url"],
                    Json(ent["details"]),
                )
                for ent in entities
            ]

            execute_values(
                cur,
                """
                INSERT INTO knowledge_entities (entity_key, entity_name, entity_type, aliases, value, source_file, source_url, details, updated_at)
                VALUES %s
                ON CONFLICT (entity_key) DO UPDATE SET
                    entity_name = EXCLUDED.entity_name,
                    entity_type = EXCLUDED.entity_type,
                    aliases = EXCLUDED.aliases,
                    value = EXCLUDED.value,
                    source_file = EXCLUDED.source_file,
                    source_url = EXCLUDED.source_url,
                    details = EXCLUDED.details,
                    updated_at = CURRENT_TIMESTAMP
                """,
                data_tuples,
                template="(%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)"
            )

            conn.commit()
            cur.close()
            conn.close()
            print(f"✅ Successfully stored all {len(entities)} entities in Neon PostgreSQL ('knowledge_entities' table)!", flush=True)
        except Exception as e:
            print(f"ℹ️ Local JSON Entity Index Ready ({len(entities)} entities). Neon DB Sync Note: {e}", flush=True)
    else:
        print("⚠️ DATABASE_URL not set — local JSON entities index ready.", flush=True)

    print("=" * 70 + "\n", flush=True)

if __name__ == "__main__":
    extract_all_entities()
