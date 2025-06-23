chrome.storage.local.get(['userId'], (res) => {
  if (res.userId) {
    console.log("✅ content_script: userId 받아옴 →", res.userId);
    localStorage.setItem('userId', res.userId); // 프론트에서 접근 가능하게 저장
  }
});
