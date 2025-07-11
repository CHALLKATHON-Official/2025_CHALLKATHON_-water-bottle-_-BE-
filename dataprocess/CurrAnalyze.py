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
    total_time = 0

    for entry in data:
        url = entry.get("url", "")
        count = entry.get("visitCount", 0)
        dwell = entry.get("dwellTimeMs", 0)

        domain = extract_domain(url)

        if domain not in domain_stats:
            domain_stats[domain] = {"visitCount": 0, "timeMsCount": 0}

        domain_stats[domain]["visitCount"] += count
        domain_stats[domain]["timeMsCount"] += dwell

        total_visits += count
        total_time += dwell

    result = []
    for domain, stats in domain_stats.items():
        visit_count = stats["visitCount"]
        time_ms = stats["timeMsCount"]

        result.append({
            "domain": domain,
            "visitCount": visit_count,
            "visitPercent": round((visit_count / total_visits) * 100, 2) if total_visits else 0,
            "timeMsCount": time_ms,
            "timePercent": round((time_ms / total_time) * 100, 2) if total_time else 0
        })

    return result

if __name__ == "__main__":
    data = json.load(sys.stdin)
    analyzed = analyze(data)
    print(json.dumps(analyzed, ensure_ascii=False, indent=2))
