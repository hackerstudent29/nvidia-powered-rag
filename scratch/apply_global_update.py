import os
import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

def process_content(text: str) -> tuple[str, dict]:
    stats = {
        'msajce_replaced': 0,
        'missing_arch_replaced': 0,
        'dup_arch_cleaned': 0
    }

    # 1. Replace standalone MSAJCE -> MSAJCEA
    # Use negative lookahead so MSAJCEA is untouched
    def replace_abbr(m):
        stats['msajce_replaced'] += 1
        return 'MSAJCEA'

    # Match exact word MSAJCE (where not followed by A)
    text = re.sub(r'\bMSAJCE(?!A)\b', replace_abbr, text)

    # 2. Fix duplicate "and Architecture" (e.g. "and Architecture and Architecture" -> "and Architecture")
    def clean_dup(m):
        stats['dup_arch_cleaned'] += 1
        return m.group(1)

    text = re.sub(r'(\band\s+Architecture\b)(?:\s+and\s+Architecture)+', clean_dup, text, flags=re.IGNORECASE)

    # 3. Fix missing "and Architecture" in full names
    # e.g., "Mohamed Sathak A.J. College of Engineering", "Mohamed Sathak A.J. Engineering College", "Mohamed Sathak AJ College of Engineering"
    def replace_full_name(m):
        stats['missing_arch_replaced'] += 1
        matched = m.group(0)
        if matched.isupper():
            return "MOHAMED SATHAK A.J. COLLEGE OF ENGINEERING AND ARCHITECTURE"
        elif matched.islower():
            return "mohamed sathak a.j. college of engineering and architecture"
        else:
            return "Mohamed Sathak A.J. College of Engineering and Architecture"

    pattern = r'Mohamed\s+Sathak\s+(?:A\.?\s*J\.?\s*)?(?:College\s+of\s+Engineering|Engineering\s+College)(?!\s+and\s+Architecture)'
    text = re.sub(pattern, replace_full_name, text, flags=re.IGNORECASE)

    # 4. Clean duplicate once more to ensure clean output
    text = re.sub(r'(\band\s+Architecture\b)(?:\s+and\s+Architecture)+', clean_dup, text, flags=re.IGNORECASE)

    return text, stats


def main():
    print("=" * 70)
    print("🚀 APPLYING GLOBAL COLLEGE NAME UPDATE ACROSS ALL FILES")
    print("=" * 70)

    target_extensions = ('.md', '.py', '.json', '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.txt')
    ignore_dirs = {'.git', 'node_modules', '.agents', '__pycache__', 'dist', 'build', '.neon', 'scratch', 'temp_skills', 'temp_skills2', '.gemini'}

    total_modified = 0
    grand_stats = {'msajce_replaced': 0, 'missing_arch_replaced': 0, 'dup_arch_cleaned': 0}

    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if file.endswith(target_extensions):
                filepath = os.path.join(root, file)
                if 'scratch' in filepath:
                    continue

                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                new_content, stats = process_content(content)

                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(new_content)
                    total_modified += 1
                    for k in grand_stats:
                        grand_stats[k] += stats[k]
                    print(f"✅ Updated: {filepath} | {stats}")

    print("=" * 70)
    print(f"Total files updated: {total_modified}")
    print(f"Total statistics: {grand_stats}")
    print("=" * 70)

if __name__ == '__main__':
    main()
