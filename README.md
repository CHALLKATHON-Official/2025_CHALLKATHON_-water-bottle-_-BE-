# 2025_CHALLKATHON_-water-bottle-_-BE-
WebSelf는 사용자의 브라우저 방문 기록을 분석하여, 언제 어떤 사이트에 얼마나 자주 접속했는지 웹에서의 시간 사용 습관을 시각화해주는 웹 서비스입니다.
회원가입 없이 쿠키 기반으로 개인 분석을 진행하며, 전 세계 다른 사용자들의 사용 패턴도 함께 비교할 수 있습니다.



# CurrAnalyze.py 설명
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
