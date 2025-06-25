let activeTabId = null;
let activeUrl = null;
let startTime = null;


function getOrSetUserId(callback) {
  chrome.storage.local.get(['userId'], (res) => {
    if (res.userId) return callback(res.userId);
    const newId = crypto.randomUUID(); // 항상 새 UUID 생성
    chrome.storage.local.set({ userId: newId }, () => callback(newId));
  });
}


chrome.runtime.onInstalled.addListener(() => {
  getOrSetUserId((userId) => {
    sendSummary(7, userId);
    sendSummary(30, userId);
    sendSummary(90, userId);
  });
  chrome.alarms.create('periodicSummary', { periodInMinutes: 10 });
});


// 탭 체류 시간 측정 → chrome.storage.local에 누적 저장
function logDwellTime(url, dwellTimeMs) {
  if (!url || !dwellTimeMs) return;
  const dayKey = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  chrome.storage.local.get(['dwellStats'], (res) => {
    const dwellStats = res.dwellStats || {};
    dwellStats[dayKey] = dwellStats[dayKey] || {};
    dwellStats[dayKey][url] = (dwellStats[dayKey][url] || 0) + dwellTimeMs;
    chrome.storage.local.set({ dwellStats });
  });
}

// 탭 전환 감지
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (activeTabId && startTime && activeUrl) {
    const dwell = Date.now() - startTime;
    logDwellTime(activeUrl, dwell);
  }
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && tab.url.startsWith("http")) {
      activeTabId = tabId;
      activeUrl = tab.url;
      startTime = Date.now();
    }
  } catch (e) {
    console.error(e);
  }
});

// 탭 닫힘 감지
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId && startTime && activeUrl) {
    const dwell = Date.now() - startTime;
    logDwellTime(activeUrl, dwell);
  }
});

// 방문 기록 분석
function collectHistory(periodInDays, callback) {
  const startTime = Date.now() - periodInDays * 24 * 60 * 60 * 1000;

  chrome.history.search({
    text: '',
    startTime: startTime,
    maxResults: 10000
  }, (results) => {
    const siteStatsByDate = {};

    for (const item of results) {
      const site = new URL(item.url).origin;
      const dateKey = new Date(item.lastVisitTime).toISOString().slice(0, 10);

      if (!siteStatsByDate[dateKey]) siteStatsByDate[dateKey] = {};
      if (!siteStatsByDate[dateKey][site]) {
        siteStatsByDate[dateKey][site] = { visitCount: 0, dwellTimeMs: 0 };
      }

      siteStatsByDate[dateKey][site].visitCount += 1;
    }

    chrome.storage.local.get(['dwellStats'], (res) => {
      const dwellStats = res.dwellStats || {};

      for (const [dateKey, stats] of Object.entries(dwellStats)) {
        if (!siteStatsByDate[dateKey]) siteStatsByDate[dateKey] = {};

        for (const [site, time] of Object.entries(stats)) {
          if (!siteStatsByDate[dateKey][site]) {
            siteStatsByDate[dateKey][site] = { visitCount: 0, dwellTimeMs: 0 };
          }
          siteStatsByDate[dateKey][site].dwellTimeMs += time;
        }
      }

      callback(siteStatsByDate, results); // ✅ results 추가로 전달
    });
  });
}


//서버에 JSON형태로 데이터 전송
function sendSummary(periodInDays, userId) {
  collectHistory(periodInDays, (siteStatsByDate, results) => {
    const period = `${periodInDays}days`;

    for (const [dateKey, siteMap] of Object.entries(siteStatsByDate)) {
      const summary = Object.entries(siteMap).map(([site, stats]) => {
        const lastVisit = results.find(item => new URL(item.url).origin === site)?.lastVisitTime || Date.now();
        return {
          site,
          visitCount: stats.visitCount,
          dwellTimeMs: stats.dwellTimeMs,
          timestamp: lastVisit
        };
      });

      const payload = {
        userId,
        period,
        summary
      };

      console.log(`📤 ${period} ${dateKey} 데이터 전송`, payload);

      fetch('https://webself-be.onrender.com/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(console.error);
    }
  });
}




// 브라우저 재시작 시에도 알람 등록
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('periodicSummary', { periodInMinutes: 10 });
});

// 주기적 요약 전송 트리거
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSummary') {
    getOrSetUserId((userId) => {
      sendSummary(7, userId);
      sendSummary(30, userId);
      sendSummary(90, userId);
    });
  }
});
