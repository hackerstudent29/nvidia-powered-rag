import os
import re

BASE_DIR = r"d:\.gemini\bots\nvidia powered AI"

# Replacement pairs: (pattern, replacement, is_regex)
EXACT_REPLACEMENTS = [
    ("Mohamed Sathak A.J. College of Engineering", "Mohamed Sathak A.J. College of Engineering and Architecture"),
    ("Mohamed Sathak A.J. Engineering College", "Mohamed Sathak A.J. College of Engineering and Architecture"),
    ("Mohamed Sathak AJ College of Engineering", "Mohamed Sathak A.J. College of Engineering and Architecture"),
    ("Mohamed Sathak AJ Engineering College", "Mohamed Sathak A.J. College of Engineering and Architecture"),
]

# Word boundary regex replacements to prevent MSAJCEA -> MSAJCEAA
REGEX_REPLACEMENTS = [
    (re.compile(r'\bMSAJCE\b'), "MSAJCEA"),
    (re.compile(r'\bmsajce\b'), "msajcea"),
]

TARGET_EXTS = {'.md', '.json', '.py', '.tsx', '.ts', '.html', '.css', '.txt', '.env', '.sql'}

TARGET_FOLDERS = [
    os.path.join(BASE_DIR, "Dataset"),
    os.path.join(BASE_DIR, "backend"),
    os.path.join(BASE_DIR, "frontend"),
    os.path.join(BASE_DIR, "admin_dashboard"),
]

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        try:
            with open(filepath, 'r', encoding='latin-1') as f:
                content = f.read()
        except Exception as e:
            print(f"Skipping {filepath}: {e}")
            return

    new_content = content

    # 1. Exact long string replacements first
    for old_str, new_str in EXACT_REPLACEMENTS:
        new_content = new_content.replace(old_str, new_str)

    # 2. Word boundary regex replacements
    for pattern, replacement in REGEX_REPLACEMENTS:
        new_content = pattern.sub(replacement, new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")
        return 1
    return 0

def main():
    print("Starting safe global college name replacement...")
    updated_count = 0
    total_files = 0
    
    for target in TARGET_FOLDERS:
        if os.path.isfile(target):
            total_files += 1
            updated_count += process_file(target)
        elif os.path.isdir(target):
            for root, dirs, files in os.walk(target):
                if any(ignored in root for ignored in ["node_modules", ".git", "dist", "__pycache__", ".venv", "antigravity-ide"]):
                    continue
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in TARGET_EXTS:
                        total_files += 1
                        fp = os.path.join(root, file)
                        updated_count += process_file(fp)

    print(f"\nDone! Updated {updated_count} out of {total_files} scanned files.")

if __name__ == '__main__':
    main()
