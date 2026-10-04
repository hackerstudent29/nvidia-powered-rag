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

ENGLISH_STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
    "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
    "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
    "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
    "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
    "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
    "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves", "tell", "give", "show", "list", "want", "need", "please",
    "details", "information", "info", "data", "file", "text", "page", "section", "topic", "header"
}

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
    seen_keys = set()

    def add_entity(entity_dict):
        key = entity_dict.get("entity_key")
        if key and key not in seen_keys:
            seen_keys.add(key)
            entities.append(entity_dict)

    # 1. SPECIAL HARDCODED & VERIFIED ENTITIES (High priority ground truth)
    add_entity({
        "entity_key": "developer_ramanathan",
        "entity_name": "Ramanathan S. (Creator / Developer of Lorin AI)",
        "entity_type": "DEVELOPER",
        "aliases": ["ram", "rama", "ramanathan", "ramzenderum", "ramzendrum", "developer", "creator", "creator of bot", "who made this bot", "who created lorin", "hackerstudent29"],
        "value": "Ramanathan S. is a Software Engineer, B.Tech Information Technology (IT) student (Batch 2024-2028) at Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA), Chennai. He is the sole architect and lead developer of the Lorin AI Campus Chatbot. Personal Portfolio: https://iamramanathan.dev | GitHub: https://github.com/hackerstudent29",
        "source_file": "msajce_developer_ramanathan.md",
        "source_url": "https://iamramanathan.dev",
        "details": {
            "name": "Ramanathan S.",
            "role": "Creator & Lead Backend/AI Engineer of Lorin AI Bot",
            "department": "B.Tech Information Technology (IT)",
            "batch": "2024-2028",
            "college": "Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA)",
            "skills": ["Java", "Spring Boot", "PostgreSQL", "React", "TypeScript", "NVIDIA NIM", "Qdrant", "RAG Architecture"],
            "portfolio": "https://iamramanathan.dev",
            "github": "https://github.com/hackerstudent29"
        }
    })

    add_entity({
        "entity_key": "principal_srinivasan",
        "entity_name": "Dr. K.S. Srinivasan (Principal of MSAJCEA)",
        "entity_type": "PERSON",
        "aliases": ["principal", "dr ks srinivasan", "dr. k.s. srinivasan", "srinivasan", "head of college"],
        "value": "Dr. K.S. Srinivasan (Ph.D) is the Principal of Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA), Siruseri, Chennai. Email: [principal@msajce-edu.in](mailto:principal@msajce-edu.in). He specializes in Electronics and Communication Engineering and Anna University Ph.D Supervisor (Ref: 1440364).",
        "source_file": "msajce_principal.md",
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

    add_entity({
        "entity_key": "contact_college_helpline",
        "entity_name": "MSAJCEA Official Contact Numbers & Office",
        "entity_type": "CONTACT_PHONE",
        "aliases": ["phone", "phone number", "contact number", "college phone", "helpline", "admission phone", "contact us"],
        "value": "MSAJCEA Campus Contact Numbers: Phone: [044-27476300](tel:04427476300), Mobile: [+91 9444103328](tel:+919444103328), Admission Helpline: [+91 9940004500](tel:+919940004500). Email: [admission@msajce-edu.in](mailto:admission@msajce-edu.in) / [info@msajce-edu.in](mailto:info@msajce-edu.in)",
        "source_file": "msajce_about.md",
        "source_url": "https://msajce-edu.in/contact.php",
        "details": {
            "landline": "044-27476300",
            "mobile": "+91 9444103328",
            "admission_helpline": "+91 9940004500",
            "email": "admission@msajce-edu.in"
        }
    })

    add_entity({
        "entity_key": "tnea_counselling_code",
        "entity_name": "MSAJCEA TNEA Counselling Code",
        "entity_type": "COURSE",
        "aliases": ["tnea code", "counselling code", "college code", "tnea counselling code", "anna university code", "1301"],
        "value": "The TNEA Counselling Code for Mohamed Sathak A.J. College of Engineering and Architecture (MSAJCEA) is **1301**.",
        "source_file": "msajce_admission.md",
        "source_url": "https://msajce-edu.in/admission.php",
        "details": {
            "tnea_code": "1301",
            "college": "Mohamed Sathak A.J. College of Engineering and Architecture"
        }
    })

    transport_routes = [
        {"route": "Velachery Bus Route / MTC", "aliases": ["velachery bus", "which bus goes velachery", "bus to velachery", "velachery route", "51", "21g"], "details": "Buses connecting Velachery to MSAJCEA (Siruseri / SIPCOT): MTC Route **51G**, **102**, **570**, **515**, or College Bus Route No. 4 (Velachery -> Guindy -> College). Campus is at SIPCOT IT Park, Siruseri, OMR Chennai."},
        {"route": "Tambaram Bus Route", "aliases": ["tambaram bus", "bus to tambaram", "tambaram route", "515"], "details": "Buses connecting Tambaram to MSAJCEA: MTC Route **515**, **555**, or College Bus Route No. 2 (Tambaram -> Chromepet -> College)."},
        {"route": "Guindy Bus Route", "aliases": ["guindy bus", "bus to guindy", "guindy route", "102"], "details": "Buses connecting Guindy to MSAJCEA: MTC Route **102**, **570**, **19B**, or College Bus Route No. 5."},
        {"route": "Broadway / Central Bus Route", "aliases": ["broadway bus", "central bus", "bus to central", "102x"], "details": "Buses connecting Broadway / Chennai Central to MSAJCEA: MTC Route **102**, **102X**, **570** along OMR expressway to Siruseri."},
    ]
    for tr in transport_routes:
        add_entity({
            "entity_key": f"transport_{re.sub(r'[^a-z0-9]', '_', tr['route'].lower())}",
            "entity_name": tr["route"],
            "entity_type": "TRANSPORT",
            "aliases": tr["aliases"],
            "value": tr["details"],
            "source_file": "msajce_transport.md",
            "source_url": "https://msajce-edu.in/transport.php",
            "details": {"route": tr["route"], "description": tr["details"]}
        })

    # 2. DYNAMIC REGEX & MARKDOWN EXTRACTION ACROSS ALL MD FILES
    email_regex = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
    phone_regex = re.compile(r'(?:\+91[\s-]?)?(?:044[\s-]?)?\d{4}[\s-]?\d{4}|\b9\d{9}\b|\b044-?\d{8}\b')
    url_regex = re.compile(r'https?://[^\s\)]+')

    # Regex for Proper Nouns / Names (e.g. "Yogesh R", "Shivam Vishwakarma", "Saqlin Mustaq M", "Dr. E. Dhiravidachelvi")
    person_name_regex = re.compile(r'\b(?:Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)?\s*([A-Z][a-z]+(?:\s+[A-Z](?:[a-z]+|\.))?+(?:\s+[A-Z][a-z]+)?)\b')
    acronym_regex = re.compile(r'\b[A-Z]{2,10}\b')

    for file_path in md_files:
        filename = os.path.basename(file_path)
        doc_info = page_links.get(filename, {})
        source_url = doc_info.get("url", "https://msajce-edu.in")
        topic_title = doc_info.get("topic_title", filename.replace(".md", "").replace("_", " ").title())

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        doc_slug = filename.replace(".md", "").replace("msajce_", "")
        
        # A. Document Entity
        doc_aliases = [
            topic_title.lower(),
            doc_slug.replace("_", " "),
            doc_slug,
            filename
        ]
        add_entity({
            "entity_key": f"doc_{doc_slug}",
            "entity_name": f"Document Topic: {topic_title}",
            "entity_type": "DOCUMENT_TOPIC",
            "aliases": list(set(doc_aliases)),
            "value": f"Verified official dataset document for {topic_title} ({filename}).",
            "source_file": filename,
            "source_url": source_url,
            "details": {"topic_title": topic_title, "file": filename}
        })

        # B. Heading Entities (#, ##, ###)
        headings = re.findall(r'^(#{1,4})\s+(.+)$', content, re.MULTILINE)
        for level_hashes, h_text in headings:
            clean_h = h_text.strip().strip('#*`')
            if len(clean_h) >= 3:
                h_slug = re.sub(r'[^a-z0-9]', '_', clean_h.lower())
                h_slug_clean = re.sub(r'_+', '_', h_slug).strip('_')
                if h_slug_clean:
                    add_entity({
                        "entity_key": f"heading_{doc_slug}_{h_slug_clean[:40]}",
                        "entity_name": f"{clean_h} ({topic_title})",
                        "entity_type": "SECTION_HEADING",
                        "aliases": [clean_h.lower(), clean_h],
                        "value": f"Section heading '{clean_h}' in {topic_title}.",
                        "source_file": filename,
                        "source_url": source_url,
                        "details": {"heading": clean_h, "topic": topic_title}
                    })

        # C. Acronyms & Scheme/Society Names (e.g. KARMA, CSI, NSS, YRC, Rotaract, NAAC, NBA, TNEA, AICTE, etc.)
        acronyms = set(acronym_regex.findall(content))
        for ac in acronyms:
            if len(ac) >= 2 and ac.lower() not in ENGLISH_STOP_WORDS:
                ac_key = f"acronym_{ac.lower()}_{doc_slug}"
                add_entity({
                    "entity_key": ac_key,
                    "entity_name": f"Term / Acronym: {ac} ({topic_title})",
                    "entity_type": "ACRONYM_TERM",
                    "aliases": [ac.lower(), ac],
                    "value": f"Official campus acronym/term '{ac}' referenced in {topic_title}.",
                    "source_file": filename,
                    "source_url": source_url,
                    "details": {"acronym": ac, "topic": topic_title}
                })

        # D. Person Names / Proper Nouns
        # Extract capital-cased multi-word phrases (e.g., "Kaushal Augmentation", "Shivam Vishwakarma", "Saqlin Mustaq", "Yogesh R")
        capital_phrases = set(re.findall(r'\b[A-Z][a-zA-Z0-9\']*(?:\s+[A-Z][a-zA-Z0-9\']*){1,3}\b', content))
        for cap_p in capital_phrases:
            cap_clean = re.sub(r'\s+', ' ', cap_p).strip()
            # Ignore markdown header hashes or common phrases
            words = cap_clean.split()
            if any(w.lower() in ENGLISH_STOP_WORDS for w in words):
                continue
            if len(cap_clean) >= 4 and not cap_clean.startswith("http"):
                p_slug = re.sub(r'[^a-z0-9]', '_', cap_clean.lower())
                p_slug = re.sub(r'_+', '_', p_slug).strip('_')
                if p_slug:
                    add_entity({
                        "entity_key": f"entity_{p_slug[:40]}",
                        "entity_name": f"Campus Entity: {cap_clean}",
                        "entity_type": "CAMPUS_ENTITY",
                        "aliases": [cap_clean.lower(), cap_clean] + [w.lower() for w in words if len(w) >= 3 and w.lower() not in ENGLISH_STOP_WORDS],
                        "value": f"Verified campus entity/term '{cap_clean}' present in {topic_title} ({filename}).",
                        "source_file": filename,
                        "source_url": source_url,
                        "details": {"entity_name": cap_clean, "topic": topic_title}
                    })

        # E. Emails as Entities
        emails = list(set(email_regex.findall(content)))
        for em in emails:
            e_key = f"email_{re.sub(r'[^a-z0-9]', '_', em.lower())}"
            add_entity({
                "entity_key": e_key,
                "entity_name": f"Email: {em} ({topic_title})",
                "entity_type": "CONTACT_EMAIL",
                "aliases": [em.lower(), f"{topic_title.lower()} email", "email", "contact email"],
                "value": f"Official Email for {topic_title}: [{em}](mailto:{em})",
                "source_file": filename,
                "source_url": source_url,
                "details": {"email": em, "topic": topic_title}
            })

        # F. Phone Numbers as Entities
        phones = list(set(phone_regex.findall(content)))
        for ph in phones:
            clean_digits = re.sub(r'[^\d+]', '', ph)
            if len(clean_digits) >= 8:
                p_key = f"phone_{re.sub(r'[^a-z0-9]', '_', clean_digits)}"
                add_entity({
                    "entity_key": p_key,
                    "entity_name": f"Phone: {ph} ({topic_title})",
                    "entity_type": "CONTACT_PHONE",
                    "aliases": [ph.lower(), clean_digits, f"{topic_title.lower()} phone", "phone", "mobile"],
                    "value": f"Contact Number for {topic_title}: [{ph}](tel:{clean_digits})",
                    "source_file": filename,
                    "source_url": source_url,
                    "details": {"phone": ph, "digits": clean_digits, "topic": topic_title}
                })

        # G. URLs as Entities
        urls = list(set(url_regex.findall(content)))
        for u in urls:
            u_clean = u.rstrip(".,)")
            u_key = f"url_{hash(u_clean) & 0xFFFFFFFF}"
            add_entity({
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
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
            cur = conn.cursor()

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
