const express = require('express');
const cors = require('cors');
const db = require('./dbconfig');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 기간별 테이블 매핑
const periodToTable = {
  '7days': 'site_summary_7days',
  '30days': 'site_summary_30days',
  '90days': 'site_summary_90days',
};

// 파이썬 분석기 연동
async function analyzeDataWithPython(rawData, pathPy) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [path.join(__dirname, pathPy)]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error("❌ Python 오류:", error);
        return reject(new Error(`Python script exited with code ${code}`));
      }

      try {
        const parsed = JSON.parse(result);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });

    python.stdin.write(JSON.stringify(rawData));
    python.stdin.end();
  });
}

// 요약 데이터 저장
app.post('/api/summary', async (req, res) => {
  const { userId, period, summary } = req.body;

  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    for (const item of summary) {
      const { site, visitCount, dwellTimeMs, timestamp } = item;

      await db.execute(
        `INSERT INTO ${table} (user_id, site, visit_count, dwell_time_ms, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, site, visitCount, dwellTimeMs, timestamp]
      );
    }

    console.log(`✅ 저장 완료 → ${table}`);
    res.status(200).send({ status: 'ok' });
  } catch (err) {
    console.error('❌ DB 저장 오류:', err);
    res.status(500).send({ status: 'error', message: 'DB 저장 실패' });
  }
});



// 프론트에서 분석 데이터 요청 시: 분석 결과 반환
app.get('/api/summary/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const [rows] = await db.execute(
      `SELECT site AS url, visit_count AS visitCount, dwell_time_ms AS dwellTimeMs
       FROM ${table}
       WHERE user_id = ?`,
      [userId]
    );

    const analyzed = await analyzeDataWithPython(rows, '../dataprocess/CurrAnalyze.py'); // 🔍 Python 분석
    res.json(analyzed);
  } catch (err) {
    console.error("❌ 분석 중 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 익스텐션 설치 여부 체크용 (데이터 존재 확인)
app.get('/api/check/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const [rows] = await db.execute(
      `SELECT * FROM ${table} WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    res.json(rows); // ❗ isExtensionInstalled 판단용
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//기간별 가장 많이 방문한 사이트 API
app.get('/api/top-sites/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const [rows] = await db.execute(
      `SELECT site AS url, visit_count AS visitCount, dwell_time_ms AS dwellTimeMs
       FROM ${table}
       WHERE user_id = ?`,
      [userId]
    );

    const analyzed = await analyzeDataWithPython(rows, '../dataprocess/CurrAnalyze.py');

    const topN = analyzed
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5); // 👈 상위 5개만

    res.json(topN);
  } catch (err) {
    console.error("❌ Top site 분석 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/activity/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const [rows] = await db.execute(
      `SELECT DATE(FROM_UNIXTIME(timestamp / 1000)) as date, SUM(visit_count) as visitCount
       FROM ${table}
       WHERE user_id = ?
       GROUP BY date
       ORDER BY date`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ 날짜별 집계 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 📍 GET /api/hourly-activity/:userId/:period
app.get('/api/hourly-activity/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const [rows] = await db.execute(
      `SELECT HOUR(FROM_UNIXTIME(timestamp / 1000)) AS hour,
              SUM(visit_count) AS totalVisitCount,
              SUM(dwell_time_ms) AS totalDwellTime
       FROM ${table}
       WHERE user_id = ?
       GROUP BY hour
       ORDER BY hour`,
      [userId]
    );

    // 📌 모든 0~23시가 포함되도록 보정
    const hourlyStats = Array.from({ length: 24 }, (_, h) => {
      const found = rows.find(r => r.hour === h);
      return {
        hour: h,
        totalVisitCount: found?.totalVisitCount || 0,
        totalDwellTime: found?.totalDwellTime || 0,
      };
    });

    res.json(hourlyStats);
  } catch (err) {
    console.error('❌ 시간대별 활동량 오류:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// server.ts
app.get('/api/category-summary/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const [rows] = await db.execute(
      `SELECT site, SUM(dwell_time_ms) AS totalTime
       FROM ${table}
       WHERE user_id = ?
       GROUP BY site`,
      [userId]
    );

    // site 분류
    const { classifySite } = require('./utils/siteCategory.js');
    const summary = {};


    for (const row of rows) {
      const { classifySite } = require('./utils/siteCategory.js');  // 이건 한 번만 위에서 호출하는 게 좋음
      let category = classifySite(row.site);
      category = String(category).trim(); // 문자열로 명확히 바꿔줌
      summary[category] = (summary[category] || 0) + Number(row.totalTime);
    }
    res.json(summary);
  } catch (err) {
    console.error('❌ 유형별 집계 오류:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// server.js 또는 routes 파일
app.get('/api/global-top5', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT site, COUNT(*) as count
      FROM site_summary_30days
      GROUP BY site
      ORDER BY count DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ 글로벌 TOP5 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const { classifySite } = require('./utils/siteCategory.js');

app.get('/api/global-category-summary', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT site, SUM(dwell_time_ms) AS totalTime
       FROM site_summary_30days
       GROUP BY site`
    );

    const categoryTotals = {};

    for (const row of rows) {
      const category = String(classifySite(row.site)).trim();
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(row.totalTime);
    }

    const result = Object.entries(categoryTotals).map(([category, totalTimeMs]) => ({
      category,
      totalTimeMs
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ 글로벌 카테고리 요약 오류:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/global-visit-ratio', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT site, COUNT(*) AS visitCount
      FROM site_summary_30days
      GROUP BY site
    `);

    const total = rows.reduce((acc, row) => acc + Number(row.visitCount), 0);

    const result = rows.map(row => {
      let domain;
      try {
        const url = new URL(row.site.startsWith('http') ? row.site : `https://${row.site}`);
        domain = url.hostname;
      } catch {
        domain = row.site;
      }

      const visitCount = Number(row.visitCount);
      const visitPercent = +(visitCount / total * 100).toFixed(2);

      return { domain, visitCount, visitPercent };
    }).sort((a, b) => b.visitPercent - a.visitPercent);

    res.json(result);
  } catch (err) {
    console.error('❌ 글로벌 비율 분석 오류:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 서버 실행 중 on port ${PORT}`));
