설치 방법
chrome://extensions 주소로 이동

우측 상단의 개발자 모드를 활성화

"압축해제된 확장 프로그램 로드" 클릭

이 프로젝트 폴더를 선택

확장 프로그램 아이콘 클릭
→ 새 탭에서 webpage.html 열림
→ 최근 하루 동안의 브라우저 방문 기록을 전체화면 웹 페이지로 표시

manifest.json	확장 프로그램의 정의 및 권한 설정 (history, tabs 사용)
background.js	아이콘 클릭 시 webpage.html을 새 탭에서 엽니다
webpage.html	방문 기록이 표시되는 전체화면 HTML 페이지
webpage.js	chrome.history.search API를 사용해 최근 24시간 기록을 가져와 리스트로 렌더링
