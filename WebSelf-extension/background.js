let activeTabId = null;
let activeUrl = null;
let startTime = null;


function getOrSetUserId(callback) {
  chrome.storage.local.get(['userId'], (res) => {
    if (res.userId) return callback(res.userId);
    const newId = crypto.randomUUID(); // ❗ 항상 새 UUID 생성
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

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('periodicSummary', { periodInMinutes: 10 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSummary') {
    getOrSetUserId((userId) => {
      sendSummary(7, userId);
      sendSummary(30, userId);
      sendSummary(90, userId);
    });
  }
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
    const siteStats = {};
    for (const item of results) {
      const site = new URL(item.url).origin;
      if (!siteStats[site]) {
        siteStats[site] = { visitCount: 0, dwellTimeMs: 0 };
      }
      siteStats[site].visitCount += 1;
    }

    chrome.storage.local.get(['dwellStats'], (res) => {
      const dwellStats = res.dwellStats || {};
      const today = new Date();
      for (let i = 0; i < periodInDays; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        const key = day.toISOString().slice(0, 10);
        const oneDayStats = dwellStats[key] || {};
        for (const [site, time] of Object.entries(oneDayStats)) {
          if (!siteStats[site]) {
            siteStats[site] = { visitCount: 0, dwellTimeMs: 0 };
          }
          siteStats[site].dwellTimeMs += time;
        }
      }
      callback(siteStats);
    });
  });
}

function sendSummary(periodInDays, userId) {
  collectHistory(periodInDays, (siteStats) => {
    const payload = {
      userId,
      period: `${periodInDays}days`,
      summary: Object.entries(siteStats).map(([site, stats]) => ({
        site,
        visitCount: stats.visitCount,
        dwellTimeMs: stats.dwellTimeMs
      })),
      timestamp: Date.now()
    };

    console.log(`📤 ${periodInDays}일 데이터 전송`, payload);

    fetch('http://localhost:3000/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(console.error);
  });
}


// 브라우저 재시작 시에도 알람 등록
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('periodicSummary', { periodInMinutes: 10 });
});

// 주기적 요약 전송 트리거
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSummary') {
    sendSummary(7);
    sendSummary(30);
    sendSummary(90);
  }
});
