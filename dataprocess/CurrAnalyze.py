import sys
import json
from urllib.parse import urlparse

def extract_domain(url):
    try:
        return urlparse(url).netloc.replace("www.", "")
    except:
        return "unknown"

def analyze(data):
    domain_stats = {}
    total_visits = 0

    for entry in data:
        url = entry.get("url", "")
        count = int(entry.get("visitCount", 0) or 0)

        if count == 0:
            continue  # 방문 횟수가 0이면 제외

        domain = extract_domain(url)

        if domain not in domain_stats:
            domain_stats[domain] = 0

        domain_stats[domain] += count
        total_visits += count

    result = []
    for domain, count in domain_stats.items():
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
