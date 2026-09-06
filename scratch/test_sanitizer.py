import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

def sanitize_response_text(text: str) -> str:
    if not text:
        return text
    # 1. Clean carriage returns
    text = text.replace('\r\n', '\n').replace('\r', '')
    
    # 2. Replace LaTeX arrow variants ($ ightarrow$, $\rightarrow$, \rightarrow, ightarrow$)
    text = re.sub(r'\$?\s*\\?\s*r?ightarrow\s*\$?', ' → ', text)
    text = re.sub(r'\$?\s*\\?\s*r?ightleftrightarrow\s*\$?', ' ↔ ', text)
    text = re.sub(r'\$?\s*\\?\s*e?ftarrow\s*\$?', ' ← ', text)
    text = re.sub(r'ightarrow\$?', ' → ', text)
    text = re.sub(r'ightleftrightarrow\$?', ' ↔ ', text)
    
    # 3. Clean up multiple spaces around arrows
    text = re.sub(r'\s*→\s*', ' → ', text)
    text = re.sub(r'\s*↔\s*', ' ↔ ', text)
    text = re.sub(r'\s*←\s*', ' ← ', text)
    return text.strip()

samples = [
    'Manjambakkam (5:50 AM) $ ightarrow$ Retteri (5:55 AM) $ ightarrow$ Padi',
    'Pickup Points: Manjambakkam (5:50 AM) $ ightarrow$ Retteri (5:55 AM) $ ightarrow$ Padi $ ightarrow$ Anna Nagar',
    'MMDA School (6:15 AM) \\rightarrow Anna Nagar (6:20 AM)',
    'Nemilichery (5:50 AM) ↔ Poonamallee (6:05 AM)'
]

for i, s in enumerate(samples, 1):
    print(f"Sample {i} BEFORE:", repr(s))
    print(f"Sample {i} AFTER: ", repr(sanitize_response_text(s)))
    print('-'*50)
