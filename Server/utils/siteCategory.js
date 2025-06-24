// Server/utils/siteCategory.js
const categoryMap = {
  "google.com": "검색",
  "instagram.com": "SNS",
  "facebook.com": "SNS",
  "youtube.com": "영상",
  "naver.com": "포털",
  "daum.net": "포털",
  "amazon.com": "쇼핑",
  "coupang.com": "쇼핑",
  // 필요한 만큼 추가
};

function classifySite(site) {
  const hostname = new URL(site).hostname;
  for (const domain in categoryMap) {
    if (hostname.includes(domain)) {
      return categoryMap[domain];
    }
  }
  return "기타";
}

module.exports = { classifySite };
