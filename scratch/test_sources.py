import sys
import urllib.request
import json
sys.stdout.reconfigure(encoding='utf-8')

def test_query(prompt):
    print(f'=== TESTING: {prompt} ===')
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/chat',
        data=json.dumps({'message': prompt}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    sources = data.get('sources', [])
    print(f'SOURCES COUNT: {len(sources)}')
    for i, s in enumerate(sources, 1):
        print(f"  {i}. {s.get('source_file')} — {s.get('title')}")
    print('\nRESPONSE SNIPPET:')
    print(data.get('response', '')[:400])
    print('\n' + '='*40 + '\n')

test_query('what are the incubation and research facilities')
test_query('give all college bus routes and details')
