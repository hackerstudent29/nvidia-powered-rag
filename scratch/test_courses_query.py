import requests

url = "http://localhost:8000/api/chat"
payload = {
    "message": "need syllabus for it dept",
    "session_id": "test_session_syllabus_concise_2"
}

headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    data = response.json()
    resp_text = data.get("response", "")
    with open("scratch/syllabus_out.txt", "w", encoding="utf-8") as f:
        f.write(resp_text)
    print("SAVED TO scratch/syllabus_out.txt SUCCESS! Length:", len(resp_text))
except Exception as e:
    print(f"Error: {e}")
