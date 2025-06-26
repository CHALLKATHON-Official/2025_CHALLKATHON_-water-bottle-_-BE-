const express = require('express');
const cors = require('cors');
const db = require('./dbconfig');
const { spawn } = require('child_process');
const path = require('path');
const { classifySite } = require('./utils/siteCategory.js');

const app = express();
app.use(cors());
app.use(express.json());

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
      if (code !== 0) return reject(new Error(`Python error: ${error}`));
      try {
        resolve(JSON.parse(result));
      } catch (err) {
        reject(err);
      }
    });

    python.stdin.write(JSON.stringify(rawData));
    python.stdin.end();
  });
}

// 데이터 저장
app.post('/api/summary', async (req, res) => {
  const { userId, period, summary } = req.body;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    for (const item of summary) {
      const { site, visitCount, dwellTimeMs, timestamp } = item;
      await db.query(
        `INSERT INTO ${table} (user_id, site, visit_count, dwell_time_ms, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, site, visitCount, dwellTimeMs, Math.floor(timestamp)]
      );
    }

    console.log(`✅ 저장 완료 → ${table}`);
    res.status(200).send({ status: 'ok' });
  } catch (err) {
    console.error('❌ DB 저장 오류:', err);
    res.status(500).send({ status: 'error', message: 'DB 저장 실패' });
  }
});

// 요약 요청
app.get('/api/summary/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const { rows } = await db.query(
      `SELECT site AS url, visit_count AS visitcount, dwell_time_ms AS dwelltimems
       FROM ${table} WHERE user_id = $1`,
      [userId]
    );
    console.log("🔥 분석 전 rows:", rows);
    const analyzed = await analyzeDataWithPython(rows, '../dataprocess/CurrAnalyze.py');
    res.json(analyzed);
  } catch (err) {
    console.error('❌ 분석 오류:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 데이터 존재 여부 확인
app.get('/api/check/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM ${table} WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Top 사이트
app.get('/api/top-sites/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const { rows } = await db.query(
      `SELECT site AS url, visit_count AS visitCount, dwell_time_ms AS dwellTimeMs
       FROM ${table} WHERE user_id = $1`,
      [userId]
    );

    const analyzed = await analyzeDataWithPython(rows, '../dataprocess/CurrAnalyze.py');
    const topN = analyzed.sort((a, b) => b.visitcount - a.visitcount).slice(0, 5);
    res.json(topN);
  } catch (err) {
    console.error('❌ Top site 오류:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 날짜별 변화
app.get('/api/activity/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const { rows } = await db.query(
      `SELECT to_char(to_timestamp(timestamp / 1000), 'YYYY-MM-DD') AS date,
              SUM(visit_count) AS visitCount
       FROM ${table}
       WHERE user_id = $1
       GROUP BY date
       ORDER BY date`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ 날짜별 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 시간대별 분석
app.get('/api/hourly-activity/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const { rows } = await db.query(
      `SELECT EXTRACT(HOUR FROM to_timestamp(timestamp / 1000))::int AS hour,
              SUM(visit_count) AS totalVisitCount,
              SUM(dwell_time_ms) AS totalDwellTime
       FROM ${table}
       WHERE user_id = $1
       GROUP BY hour
       ORDER BY hour`,
      [userId]
    );

    const hourlyStats = Array.from({ length: 24 }, (_, h) => {
      const found = rows.find(r => r.hour === h);
      return {
        hour: h,
        totalvisitcount: found?.totalvisitcount || 0,
        totaldwelltime: found?.totaldwelltime || 0,
      };
    });

    res.json(hourlyStats);
  } catch (err) {
    console.error("❌ 시간대별 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 카테고리별 집계
app.get('/api/category-summary/:userId/:period', async (req, res) => {
  const { userId, period } = req.params;
  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    const { rows } = await db.query(
      `SELECT site, SUM(dwell_time_ms) AS totalTime
       FROM ${table}
       WHERE user_id = $1
       GROUP BY site`,
      [userId]
    );

    const summary = {};
    for (const row of rows) {
      const category = String(classifySite(row.site)).trim();
      summary[category] = (summary[category] || 0) + Number(row.totaltime);
    }

    res.json(summary);
  } catch (err) {
    console.error("❌ 카테고리 요약 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 글로벌 Top 8
app.get('/api/global-top8', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT site, COUNT(*) as count
       FROM site_summary_30days
       GROUP BY site
       ORDER BY count DESC
       LIMIT 8`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ 글로벌 Top8 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 글로벌 카테고리 요약
app.get('/api/global-category-summary', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT site, SUM(dwell_time_ms) AS totalTime
       FROM site_summary_30days
       GROUP BY site`
    );

    const categoryTotals = {};
    for (const row of rows) {
      const category = String(classifySite(row.site)).trim();
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(row.totaltime);
    }

    const result = Object.entries(categoryTotals).map(([category, totalTimeMs]) => ({
      category,
      totalTimeMs
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ 글로벌 카테고리 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 글로벌 방문 비율
app.get('/api/global-visit-ratio', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT site, SUM(visit_count) AS totalVisitCount
        FROM site_summary_30days
        GROUP BY site`
    );

    const total = rows.reduce((acc, row) => acc + Number(row.totalvisitcount || 0), 0);

    const result = rows.map(row => {
      let domain;
      try {
        const url = new URL(row.site.startsWith('http') ? row.site : `https://${row.site}`);
        domain = url.hostname;
      } catch {
        domain = row.site;
      }

      const visitCount = row.totalvisitcount ? Number(row.totalvisitcount) : 0;
      const visitPercent = total > 0
        ? Number(((visitCount / total) * 100).toFixed(4))
        : 0;

      return { domain, visitCount, visitPercent };
    }).sort((a, b) => b.visitPercent - a.visitPercent);

    res.json(result);
  } catch (err) {
    console.error("❌ 글로벌 비율 분석 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 서버 실행 중 on port ${PORT}`));
