import os
import sys
import re
import json
import time
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
PAGES_LINK_FILE = os.path.join(DATASET_DIR, "links folder", "pageslink.md")
RESOURCE_JSON_FILE = os.path.join(BACKEND_DIR, "data", "resource_links.json")
RESOURCE_MD_FILE = os.path.join(DATASET_DIR, "links folder", "resource_catalog.md")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

def load_pages():
    pages = []
    if os.path.exists(PAGES_LINK_FILE):
        with open(PAGES_LINK_FILE, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        current_doc = None
        for line in content.splitlines():
            line = line.strip()
            if not line:
                continue
            if line.endswith(".md"):
                current_doc = line
            elif "\t" in line and current_doc:
                parts = line.split("\t")
                if len(parts) >= 2:
                    topic_title = parts[0].strip()
                    url = parts[1].strip()
                    if not url.startswith("http"):
                        url = "https://" + url
                    pages.append({"doc_name": current_doc, "title": topic_title, "url": url})
                    current_doc = None
    return pages

def is_valid_url(url):
    try:
        parsed = urlparse(url)
        return bool(parsed.scheme and parsed.netloc)
    except Exception:
        return False

def verify_link(url, timeout=1.5):
    try:
        res = requests.head(url, headers=HEADERS, allow_redirects=True, timeout=timeout)
        if res.status_code < 400:
            return True, res.status_code
        # Retry with GET if HEAD fails
        res = requests.get(url, headers=HEADERS, allow_redirects=True, timeout=timeout, stream=True)
        return res.status_code < 400, res.status_code
    except Exception as e:
        return False, str(e)

def extract_resources_from_page(page_info):
    page_url = page_info["url"]
    page_title = page_info["title"]
    doc_name = page_info["doc_name"]
    
    print(f"Fetching resources from: {page_title} ({page_url})...", flush=True)
    resources = []

    try:
        resp = requests.get(page_url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            print(f"  [Warn] Failed to load {page_url} (HTTP {resp.status_code})", flush=True)
            return resources
        
        soup = BeautifulSoup(resp.text, "html.parser")

        # 1. Extract PDFs, Documents, Zip files & Video Links from <a> tags
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#") or href.startswith("javascript:"):
                continue
            
            full_url = urljoin(page_url, href)
            if not is_valid_url(full_url):
                continue

            link_text = a.get_text(strip=True) or a.get("title", "").strip() or os.path.basename(full_url)
            lower_url = full_url.lower()

            res_type = None
            if lower_url.endswith(".pdf"):
                res_type = "pdf"
            elif any(lower_url.endswith(ext) for ext in [".doc", ".docx", ".xls", ".xlsx", ".zip", ".rar"]):
                res_type = "file"
            elif any(domain in lower_url for domain in ["youtube.com", "youtu.be", "vimeo.com"]) or any(lower_url.endswith(ext) for ext in [".mp4", ".webm"]):
                res_type = "video"
            
            if res_type:
                parent_text = a.find_parent().get_text(strip=True) if a.find_parent() else ""
                desc = parent_text[:180] if len(parent_text) > len(link_text) else f"{res_type.upper()} resource from {page_title}"
                resources.append({
                    "title": link_text if len(link_text) > 3 else f"{page_title} - {res_type.upper()}",
                    "resource_type": res_type,
                    "url": full_url,
                    "description": desc,
                    "source_page_title": page_title,
                    "source_page_url": page_url,
                    "doc_name": doc_name
                })

        # 2. Extract key Images from <img> tags
        for img in soup.find_all("img", src=True):
            src = img["src"].strip()
            if not src or src.startswith("data:"):
                continue
            
            full_url = urljoin(page_url, src)
            if not is_valid_url(full_url):
                continue

            lower_url = full_url.lower()
            if any(lower_url.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                alt = img.get("alt", "").strip() or img.get("title", "").strip() or os.path.basename(full_url)
                if any(skip in lower_url for skip in ["logo", "icon", "banner", "loader", "favicon"]):
                    continue
                
                resources.append({
                    "title": alt if len(alt) > 3 else f"{page_title} Image",
                    "resource_type": "image",
                    "url": full_url,
                    "description": f"Image from {page_title}: {alt}",
                    "source_page_title": page_title,
                    "source_page_url": page_url,
                    "doc_name": doc_name
                })

    except Exception as e:
        print(f"  [Error] Processing {page_url}: {e}", flush=True)

    return resources


def main():
    print("=" * 70, flush=True)
    print("🔗 MSAJCEA RESOURCE LINK EXTRACTOR & VALIDATOR", flush=True)
    print("=" * 70, flush=True)

    pages = load_pages()
    print(f"Loaded {len(pages)} web pages from {PAGES_LINK_FILE}\n", flush=True)

    raw_resources = []
    seen_urls = set()

    for page in pages:
        res_list = extract_resources_from_page(page)
        for r in res_list:
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                raw_resources.append(r)

    print(f"\nExtracted {len(raw_resources)} candidate resource links. Verifying HTTP statuses with 30 parallel workers...\n", flush=True)

    from concurrent.futures import ThreadPoolExecutor, as_completed

    def check_item(r):
        is_ok, status = verify_link(r["url"])
        if is_ok:
            r["status"] = "active"
            r["http_code"] = status
            return r
        return None

    valid_resources = []
    with ThreadPoolExecutor(max_workers=80) as executor:
        futures = {executor.submit(check_item, r): r for r in raw_resources}
        count = 0
        for future in as_completed(futures):
            count += 1
            res = future.result()
            if res:
                valid_resources.append(res)
                print(f"  [{count}/{len(raw_resources)}] ✅ ACTIVE ({res['http_code']}) [{res['resource_type'].upper()}]: {res['title'][:40]} -> {res['url'][:70]}", flush=True)
            if count % 200 == 0:
                print(f"  --> Progress: {count}/{len(raw_resources)} links checked ({len(valid_resources)} active found)...", flush=True)

    # Save to JSON
    os.makedirs(os.path.dirname(RESOURCE_JSON_FILE), exist_ok=True)
    with open(RESOURCE_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(valid_resources, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(valid_resources)} verified active resource links to JSON -> {RESOURCE_JSON_FILE}", flush=True)

    # Save to Markdown catalog
    md_content = "# 📁 Official MSAJCEA Verified Resource Catalog\n\n"
    md_content += "Automated inventory of verified active PDFs, document files, images, and video resources extracted from official college pages.\n\n"
    
    # Group by resource type
    by_type = {}
    for r in valid_resources:
        by_type.setdefault(r["resource_type"], []).append(r)
    
    for rtype, items in sorted(by_type.items()):
        md_content += f"## {rtype.upper()} Resources ({len(items)} items)\n\n"
        md_content += "| Title | Description | Source Page | Verified Link |\n"
        md_content += "|---|---|---|---|\n"
        for item in items:
            title_clean = item["title"].replace("|", "-").replace("\n", " ")
            desc_clean = item["description"].replace("|", "-").replace("\n", " ")[:120]
            source_clean = item["source_page_title"].replace("|", "-")
            md_content += f"| **{title_clean}** | {desc_clean} | [{source_clean}]({item['source_page_url']}) | [View {rtype.upper()}]({item['url']}) |\n"
        md_content += "\n"

    with open(RESOURCE_MD_FILE, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Saved human-readable Markdown catalog -> {RESOURCE_MD_FILE}", flush=True)
    print("=" * 70 + "\n", flush=True)

if __name__ == "__main__":
    main()
