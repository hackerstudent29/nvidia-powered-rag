import os
import re

BASE_DIR = r"d:\.gemini\bots\nvidia powered AI"

REPLACEMENTS = [
    ("Mohamed Sathak A.J. College of Engineering", "Mohamed Sathak A.J. College of Engineering and Architecture"),
    ("Mohamed Sathak A.J. Engineering College", "Mohamed Sathak A.J. College of Engineering and Architecture"),
    ("Mohamed Sathak AJ College of Engineering", "Mohamed Sathak A.J. College of Engineering and Architecture"),
    ("Mohamed Sathak AJ Engineering College", "Mohamed Sathak A.J. College of Engineering and Architecture"),
    ("MSAJCE", "MSAJCEA"),
    ("msajce", "msajcea"),
]

# File extensions to scan
TARGET_EXTS = {'.md', '.json', '.py', '.tsx', '.ts', '.html', '.css', '.txt'}

# Folders to scan
TARGET_FOLDERS = [
    os.path.join(BASE_DIR, "Dataset"),
    os.path.join(BASE_DIR, "backend"),
    os.path.join(BASE_DIR, "frontend", "src"),
    os.path.join(BASE_DIR, "frontend", "index.html"),
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
    for old_str, new_str in REPLACEMENTS:
        new_content = new_content.replace(old_str, new_str)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

def main():
    print("Starting global college name replacement...")
    for target in TARGET_FOLDERS:
        if os.path.isfile(target):
            process_file(target)
        elif os.path.isdir(target):
            for root, dirs, files in os.walk(target):
                # Skip node_modules, .git, dist, __pycache__
                if any(ignored in root for ignored in ["node_modules", ".git", "dist", "__pycache__", ".venv"]):
                    continue
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in TARGET_EXTS:
                        process_file(os.path.join(root, file))
    print("Replacement complete!")

if __name__ == '__main__':
    main()
