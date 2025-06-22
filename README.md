# 2025_CHALLKATHON_-water-bottle-_-BE-
WebSelf는 사용자의 브라우저 방문 기록을 분석하여, 언제 어떤 사이트에 얼마나 자주 접속했는지 웹에서의 시간 사용 습관을 시각화해주는 웹 서비스입니다.
회원가입 없이 쿠키 기반으로 개인 분석을 진행하며, 전 세계 다른 사용자들의 사용 패턴도 함께 비교할 수 있습니다.



# CurrAnalyze.py 설명
<details>
도메인별 웹사이트 방문 시간 통계 분석 스크립트입니다.
입력된 JSON 데이터를 바탕으로 각 사이트의 방문 횟수와 체류 시간을 도메인 단위로 집계하여 **비율(%)**까지 계산해 줍니다.

입력 형식
{
    "site": "https://example.com/page/1",
    "visitCount": 3,
    "dwellTimeMs": 12000
}

출력 형식
{
    "domain": "example.com",
    "visitCount": 3,
    "visitPercent": 37.5,
    "timeMsCount": 12000,
    "timePercent": 60.0
}
</details>


---


📌 WebSelf 개인정보 처리방침 (Privacy Policy)

이 확장 프로그램은 사용자의 웹사이트 방문 기록, 체류 시간 등의 정보를 익명으로 수집합니다.
수집된 정보는 사용자의 생산성 분석 및 통계 목적으로만 사용되며, 개인을 식별할 수 있는 정보는 저장하지 않습니다.

수집 항목:
- 방문한 사이트의 도메인
- 방문 횟수 및 체류 시간
- 브라우저 내 익명 사용자 ID

수집된 데이터는 다음 목적에만 사용됩니다:
- 개인의 웹 사용 패턴 분석
- 서버 전송을 통한 익명 통계 저장
- 시간 관리에 도움을 주는 시각화 제공

데이터 보관 및 전송:
- 수집된 정보는 안전한 서버에 익명으로 전송됩니다.
- 사용자는 언제든지 확장 프로그램을 제거하여 데이터 수집을 중단할 수 있습니다.

---

📌 Privacy Policy (English)

This extension collects anonymized data on users' website visits and dwell times.
No personally identifiable information (PII) is stored or transmitted.

Collected data:
- Visited site domains
- Visit counts and duration
- Anonymous user ID (stored locally)

Purpose of use:
- Analyze usage patterns
- Submit anonymized stats to server
- Visualize time usage for productivity

Data is stored and transmitted securely.
You may uninstall the extension at any time to stop data collection.
