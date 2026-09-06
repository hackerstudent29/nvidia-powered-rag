import os
import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

def clean_and_update_text(text: str) -> tuple[str, dict]:
    stats = {
        'dup_arch': 0,
        'missing_arch': 0,
        'msajce_abbr': 0
    }

    original = text

    # 1. First replace any standalone abbreviation MSAJCE (not followed by A, letter, digit)
    # e.g. "MSAJCE" -> "MSAJCEA", "**MSAJCE**" -> "**MSAJCEA**", "(MSAJCE)" -> "(MSAJCEA)", "MSAJCE's" -> "MSAJCEA's"
    # Note: avoid matching msajcea, msajce.edu.in if any
    def replace_msajce(match):
        stats['msajce_abbr'] += 1
        return 'MSAJCEA'

    # Match MSAJCE when it's standalone uppercase and NOT followed by A
    text = re.sub(r'\bMSAJCE(?!A)\b', replace_msajce, text)

    # 2. Fix duplicate "and Architecture" (e.g., "and Architecture and Architecture" -> "and Architecture")
    def fix_dup_arch(match):
        stats['dup_arch'] += 1
        # preserve case of 'and Architecture'
        return match.group(1)

    # Clean multiple consecutive "and Architecture"
    # match patterns like "and Architecture and Architecture" or "and Architecture and Architecture and Architecture"
    text = re.sub(r'(\band\s+Architecture\b)(?:\s+and\s+Architecture)+', r'\1', text, flags=re.IGNORECASE)

    # 3. Update full college name variants if missing "and Architecture"
    # Patterns like:
    # "Mohamed Sathak A.J. College of Engineering"
    # "Mohamed Sathak A. J. College of Engineering"
    # "Mohamed Sathak AJ College of Engineering"
    # "Mohamed Sathak College of Engineering"
    # "Mohamed Sathak A.J. Engineering College"
    # "Mohamed Sathak Engineering College"
    pattern = r'Mohamed\s+Sathak\s+(?:A\.?\s*J\.?\s*)?(?:College\s+of\s+Engineering|Engineering\s+College)(?!\s+and\s+Architecture)'

    def replace_full_name(match):
        stats['missing_arch'] += 1
        # check casing
        matched_str = match.group(0)
        if matched_str.isupper():
            return "MOHAMED SATHAK A.J. COLLEGE OF ENGINEERING AND ARCHITECTURE"
        elif matched_str.islower():
            return "mohamed sathak a.j. college of engineering and architecture"
        else:
            return "Mohamed Sathak A.J. College of Engineering and Architecture"

    text = re.sub(pattern, replace_full_name, text, flags=re.IGNORECASE)

    # Run duplicate cleaner again just in case
    text = re.sub(r'(\band\s+Architecture\b)(?:\s+and\s+Architecture)+', r'\1', text, flags=re.IGNORECASE)

    return text, stats


def run_dry_run():
    print("Running Dry Run across all files...")
    target_extensions = ('.md', '.py', '.json', '.ts', '.tsx', '.js', '.jsx', '.html', '.css')
    ignore_dirs = {'.git', 'node_modules', '.agents', '__pycache__', 'dist', 'build', '.neon', 'scratch', 'temp_skills', 'temp_skills2', '.gemini'}

    total_files_modified = 0
    total_stats = {'dup_arch': 0, 'missing_arch': 0, 'msajce_abbr': 0}

    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if file.endswith(target_extensions):
                filepath = os.path.join(root, file)
                # Skip the script itself and test script
                if 'scratch' in filepath:
                    continue
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                new_content, stats = clean_and_update_text(content)

                if new_content != content:
                    total_files_modified += 1
                    for k in total_stats:
                        total_stats[k] += stats[k]
                    print(f"MODIFIED: {filepath} -> {stats}")

    print(f"\nSummary:")
    print(f"Total files to modify: {total_files_modified}")
    print(f"Total stats: {total_stats}")

if __name__ == '__main__':
    run_dry_run()
