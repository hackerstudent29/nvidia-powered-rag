import re

def expand_number_words(num_str: str) -> str:
    """Helper to convert simple numbers and currencies into readable spoken form."""
    try:
        val = int(num_str)
        if val == 0: return "zero"
        # Small conversions
        units = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", 
                 "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
        tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
        
        if 0 < val < 20:
            return units[val]
        if 20 <= val < 100:
            t, u = divmod(val, 10)
            return f"{tens[t]} {units[u]}".strip()
        if 100 <= val < 1000:
            h, r = divmod(val, 100)
            rest = expand_number_words(str(r)) if r > 0 else ""
            return f"{units[h]} hundred {rest}".strip()
        if 1000 <= val < 100000:
            k, r = divmod(val, 1000)
            rest = expand_number_words(str(r)) if r > 0 else ""
            return f"{expand_number_words(str(k))} thousand {rest}".strip()
    except Exception:
        pass
    return num_str

def normalize_tts_text_for_speech(markdown_text: str) -> str:
    if not markdown_text:
        return ""
    
    text = markdown_text

    # 1. Clean code blocks, raw markdown wrappers, markdown bold/italic stress, citations
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'\[\d+\]|\[Source:[^\]]+\]|📌|⚡|✓|✉️|📞|👉|🗺️|🧭|📍|🎓|🏛️|🚌|🗓️|🌐|✨|💡|🔥', '', text)

    # 2. Convert URLs & Links before table parsing
    # Convert markdown links [text](url) -> text
    text = re.sub(r'\[\s*([^\]]+?)\s*\]\(\s*https?://[^\)]+\)', r'\1', text)
    # Direct URLs https://msajce-edu.in -> "the official website" or spelled out
    def _url_replacer(match):
        url = match.group(0)
        domain_match = re.search(r'https?://(?:www\.)?([^/\s]+)', url)
        if domain_match:
            dom = domain_match.group(1).lower()
            if 'msajce' in dom:
                return 'M S A J C E dot E D U dot I N'
            parts = dom.split('.')
            return ' dot '.join(' '.join(p.upper() if len(p) <= 3 else p for p in parts))
        return "the official website"
    
    text = re.sub(r'https?://[^\s\)]+', _url_replacer, text)
    text = re.sub(r'mailto:[^\s\)]+', '', text)
    text = re.sub(r'tel:[^\s\)]+', '', text)

    # 3. Emails & Phone Numbers
    # Email: admin@msajce.edu.in -> admin at M S A J C E dot E D U dot I N
    def _email_replacer(match):
        user, domain = match.group(1), match.group(2)
        domain_parts = domain.split('.')
        spoken_domain = " dot ".join([" ".join(list(p.upper())) if len(p) <= 4 else p for p in domain_parts])
        return f"{user} at {spoken_domain}"
    text = re.sub(r'\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b', _email_replacer, text)

    # Phone numbers: 044-12345678 or +91 9876543210
    def _phone_replacer(match):
        digits = re.sub(r'\D', '', match.group(0))
        if len(digits) == 10:
            return f"{digits[:5]}, {digits[5:]}"
        elif len(digits) == 12 and digits.startswith('91'):
            return f"plus 9 1, {digits[2:7]}, {digits[7:]}"
        elif len(digits) >= 8:
            # Group in pairs/triplets
            chunks = [digits[i:i+3] for i in range(0, len(digits), 3)]
            return ", ".join(" ".join(list(c)) for c in chunks)
        return match.group(0)
    text = re.sub(r'(\+91[\s\-]?)?(\(?0\d{2,4}\)?[\s\-]?)?\d{6,8}\b', _phone_replacer, text)

    # 4. Dates & Times Normalization
    # ISO Dates 2026-09-06 or 06/09/2026
    months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    ordinals = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "nineth", "tenth",
                "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth",
                "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh", "twenty-eighth", "twenty-nineth", "thirtieth", "thirty-first"]

    def _date_iso_replacer(match):
        y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            month_str = months[m]
            day_str = ordinals[d] if d < len(ordinals) else str(d)
            return f"{month_str} {day_str}, {y}"
        return match.group(0)

    def _date_slash_replacer(match):
        d, m, y = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            month_str = months[m]
            day_str = ordinals[d] if d < len(ordinals) else str(d)
            return f"{month_str} {day_str}, {y}"
        return match.group(0)

    text = re.sub(r'\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b', _date_iso_replacer, text)
    text = re.sub(r'\b(0[1-9]|[12]\d|3[01])/(0[1-9]|1[0-2])/(20\d\d)\b', _date_slash_replacer, text)

    # Time: 7:30 AM / 8:00 AM / 12:45 PM
    def _time_replacer(match):
        h, m, ampm = match.group(1), match.group(2), match.group(3).upper()
        ampm_spoken = "A M" if "A" in ampm else "P M"
        if m == "00":
            return f"{h} {ampm_spoken}"
        return f"{h} {m} {ampm_spoken}"
    text = re.sub(r'\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\b', _time_replacer, text)

    # 5. Currency & Numbers
    # ₹25,000 / Rs. 25,000 / Rs 25000
    def _currency_replacer(match):
        val_str = match.group(2).replace(',', '')
        spoken_val = expand_number_words(val_str)
        return f"{spoken_val} rupees"
    text = re.sub(r'(₹|Rs\.?|INR)\s*([\d,]+)', _currency_replacer, text)

    # 6. Markdown tables & structured lists transformation into natural spoken sentences
    lines = text.split("\n")
    processed_lines = []
    table_headers = []
    
    for line in lines:
        l = line.strip()
        if not l:
            continue
        
        # Skip table separator lines (e.g. |---|---|)
        if re.match(r'^\|?[\s\-:|]+\|?$', l):
            continue
            
        if l.startswith("|") and l.endswith("|"):
            cells = [c.strip() for c in l.split("|") if c.strip()]
            if not table_headers:
                table_headers = cells
                continue
            else:
                row_parts = []
                for idx, cell in enumerate(cells):
                    header = table_headers[idx] if idx < len(table_headers) else f"Item {idx+1}"
                    clean_cell = re.sub(r'[*_`]', '', cell)
                    row_parts.append(f"{header} is {clean_cell}")
                processed_lines.append("... " + ", ".join(row_parts) + ".")
                continue
        else:
            table_headers = []

        # Bullet points transformation with intonation pauses
        if re.match(r'^[-\*\+•]\s+', l):
            bullet = re.sub(r'^[-\*\+•]\s+', '', l).strip()
            bullet = re.sub(r'[*_`]', '', bullet)
            processed_lines.append(f"... {bullet}.")
            continue

        # Headers transformation with natural cadence
        if re.match(r'^#{1,6}\s+', l):
            header_text = re.sub(r'^#{1,6}\s+', '', l).strip()
            header_text = re.sub(r'[*_`]', '', header_text)
            if header_text and not header_text.endswith(('.', '!', '?', ':')):
                header_text += "."
            processed_lines.append(f"{header_text} ...")
            continue

        clean_l = re.sub(r'[*_`]', '', l).strip()
        if clean_l and not clean_l.endswith(('.', '!', '?', ':')):
            clean_l += "."
        processed_lines.append(clean_l)

    text = " ".join(processed_lines)

    # 7. College Pronunciation Dictionary & Acronym Mapping
    # High-accuracy institutional dictionary
    PRONUNCIATION_DICT = [
        (r'\bMSAJCEA\b|\bMSAJCE\b', 'Mohamed Sathak A J College of Engineering'),
        (r'\bHOD\b|\bHODs\b', 'Head of the Department'),
        (r'\bSIPCOT\b', 'Sip-cot'),
        (r'\bOMR\b', 'O M R'),
        (r'\bSiruseri\b', 'Siru-seri'),
        (r'\bEgattur\b', 'Ega-ttoor'),
        (r'\bNavalur\b', 'Nava-loor'),
        (r'\bNAAC\b', 'N A A C'),
        (r'\bAICTE\b', 'A I C T E'),
        (r'\bTNEA\b', 'T N E A'),
        (r'\bNBA\b', 'N B A'),
        (r'\bNIRF\b', 'N I R F'),
        (r'\bIQAC\b', 'I Q A C'),
        (r'\bIEEE\b', 'I E E E'),
        (r'\bISTE\b', 'I S T E'),
        (r'\bNPTEL\b', 'N P T E L'),
        (r'\bAnna University\b', 'Anna University'),
        
        # Academic Departments & Degrees
        (r'\bAI&DS\b|\bAIDS\b', 'A I and Data Science'),
        (r'\bAIML\b|\bAI/ML\b', 'A I and Machine Learning'),
        (r'\bCSE\b', 'C S E'),
        (r'\bECE\b', 'E C E'),
        (r'\bEEE\b', 'E E E'),
        (r'\bIT\b', 'I T'),
        (r'\bMECH\b', 'Mechanical'),
        (r'\bCIVIL\b', 'Civil'),
        (r'\bB\.Tech\b|\bBTech\b', 'B Tech'),
        (r'\bM\.Tech\b|\bMTech\b', 'M Tech'),
        (r'\bB\.E\b|\bBE\b', 'B E'),
        (r'\bM\.E\b|\bME\b', 'M E'),
        (r'\bM\.B\.A\b|\bMBA\b', 'M B A'),
        (r'\bPh\.D\b|\bPhD\b', 'P H D'),
        (r'\bUG\b', 'undergraduate'),
        (r'\bPG\b', 'postgraduate'),
        (r'\bCGPA\b', 'C G P A'),
        (r'\bGPA\b', 'G P A'),
        (r'\bLPA\b|\blpa\b', 'Lakhs per annum'),
        (r'\bRAG\b', 'R A G'),

        # General abbreviations & acronyms
        (r'\be\.g\.\b|\beg\b', 'for example,'),
        (r'\bi\.e\.\b|\bie\b', 'that is,'),
        (r'\betc\.\b|\betc\b', 'and so forth,'),
        (r'\bvs\.\b|\bvs\b', 'versus'),
        (r'\bAI\b', 'A I'),
        (r'\bML\b', 'M L'),
        (r'\bLLM\b|\bLLMs\b', 'L L M'),
        (r'\bAPI\b|\bAPIs\b', 'A P I'),
        (r'\bDr\.\b', 'Doctor'),
        (r'\bProf\.\b', 'Professor'),
        (r'\bMr\.\b', 'Mister'),
        (r'\bMrs\.\b', 'Missus'),
    ]

    for pattern, replacement in PRONUNCIATION_DICT:
        text = re.sub(pattern, replacement, text)

    # 8. Number Formatting & Range Enunciation
    text = re.sub(r'(\d+)\s*[\–\-]\s*(\d+)', r'\1 to \2', text)
    text = re.sub(r'(\d+)\+', r'\1 plus', text)

    # Clean multiple spaces & normalize punctuation pauses
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Test test input from user prompt
sample_input = """
### CSE Department
HOD: Dr. R. Kumar
Students: 120
Website: https://msajce-edu.in
Contact: admin@msajce.edu.in / 044-12345678
Date: 2026-09-06
Bus timing: 8:30 AM
Fee: ₹25,000

| Bus | Route | Time |
| 21A | Chennai to Tambaram | 7:30 AM |
| 21B | Chennai to Guindy | 8:00 AM |

Degrees offered: B.Tech in CSE, AI&DS, ECE. NAAC accredited, TNEA code 3118.
"""

print("--- TRANSFORMED SPEECH OUTPUT ---")
print(normalize_tts_text_for_speech(sample_input))
