import sys
import json
from urllib.parse import urlparse

def extract_domain(url):
    try:
        return urlparse(url).netloc.replace("www.", "")
    except:
        return "unknown"

def analyze(data):
    domain_counts = {}
    total_visits = 0

    for entry in data:
        url = entry.get("url", "")
        count = entry.get("visitCount", 0)

        domain = extract_domain(url)
        domain_counts[domain] = domain_counts.get(domain, 0) + count
        total_visits += count

    result = []
    for domain, count in domain_counts.items():
        result.append({
            "domain": domain,
            "visitCount": count,
            "visitPercent": round((count / total_visits) * 100, 2) if total_visits else 0
        })

    return result

if __name__ == "__main__":
    data = json.load(sys.stdin)
    analyzed = analyze(data)
    print(json.dumps(analyzed, ensure_ascii=False, indent=2))
