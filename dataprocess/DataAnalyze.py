import sys
import json
from datetime import datetime
from collections import defaultdict

def analyze_date_and_hour(data):
    time_counter = defaultdict(int)

    for entry in data:
        visit_time = entry.get("visitTime")
        if not visit_time:
            continue

        dt = datetime.fromtimestamp(visit_time / 1000)

        date_str = dt.strftime("%Y-%m-%d")
        hour = dt.hour
        time_counter[(date_str, hour)] += 1

    result = []
    for (date_str, hour), count in sorted(time_counter.items()):
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        result.append({
            "date": date_str,
            "year": dt.year,
            "month": dt.month,
            "day": dt.day,
            "weekday": dt.strftime("%A"),
            "hour": hour,
            "visitCount": count
        })

    return result

if __name__ == "__main__":
    data = json.load(sys.stdin)
    analyzed = analyze_date_and_hour(data)
    print(json.dumps(analyzed, ensure_ascii=False, indent=2))
