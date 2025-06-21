import sys
import json
from collections import defaultdict
from urllib.parse import urlparse

# Step 1: 입력 읽기
data = sys.stdin.read()
visit_data = json.loads(data)

# Step 2: 도메인별 방문 수 집계
domain_count = defaultdict(int)
for entry in visit_data:
    full_url = entry.get("url", "")
    visit_count = entry.get("visitCount", 0)

    try:
        parsed = urlparse(full_url)
        domain = parsed.netloc  # ex: 'example.com', 'www.naver.com'
        if domain:
            domain_count[domain] += visit_count
    except Exception as e:
        continue  # malformed URL 무시

# Step 3: 전체 합계 계산
total_visits = sum(domain_count.values())

# Step 4: 분석 결과 구성
result = []
for domain, count in domain_count.items():
    percent = round(count / total_visits * 100, 2) if total_visits > 0 else 0
    result.append({
        "domain": domain,
        "visitCount": count,
        "percent": percent
    })

# Step 5: 정렬 후 출력
result.sort(key=lambda x: x["visitCount"], reverse=True)
print(json.dumps(result, ensure_ascii=False))
