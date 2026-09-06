import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

urls_found = set()
emails_found = set()

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '.agents', '__pycache__', 'dist', 'build', '.neon', 'scratch', 'temp_skills', 'temp_skills2'}]
    for file in files:
        if file.endswith(('.py', '.json', '.ts', '.tsx', '.md')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            urls = re.findall(r'https?://[^\s)\]"\'>]+', content)
            emails = re.findall(r'[\w\.-]+@[\w\.-]+', content)
            for u in urls:
                if 'msajce' in u.lower():
                    urls_found.add((filepath, u))
            for e in emails:
                if 'msajce' in e.lower():
                    emails_found.add((filepath, e))

print(f"Total URLs found with msajce: {len(urls_found)}")
for fp, u in sorted(list(urls_found))[:10]:
    print(f"URL: {u} (in {fp})")

print(f"\nTotal Emails found with msajce: {len(emails_found)}")
for fp, e in sorted(list(emails_found))[:10]:
    print(f"Email: {e} (in {fp})")
