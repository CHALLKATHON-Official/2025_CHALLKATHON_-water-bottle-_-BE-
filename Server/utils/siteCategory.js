const siteCategoryMap = {
  "www.google.com": "검색",
  "search.google.com": "검색",
  "www.naver.com": "포털",
  "search.naver.com": "검색",
  "www.instagram.com": "SNS",
  "www.youtube.com": "영상",
  "www.facebook.com": "SNS",
  "www.amazon.com": "쇼핑",
  "www.coupang.com": "쇼핑",
  "news.naver.com": "뉴스",
  "www.reddit.com": "커뮤니티",
  "mail.google.com": "메일",
};

const classifySite = (url) => {
  try {
    const domain = new URL(url).hostname;
    return siteCategoryMap[domain] || "기타";
  } catch (e) {
    console.error("❌ URL 파싱 실패:", url);
    return "기타";
  }
};

module.exports = { classifySite };
