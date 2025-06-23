const express = require('express');
const cors = require('cors');
const db = require('./dbconfig');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 기간별 테이블 매핑
const periodToTable = {
  '7days': 'site_summary_7days',
  '30days': 'site_summary_30days',
  '90days': 'site_summary_90days',
};

// ✅ 파이썬 분석기 연동
async function analyzeDataWithPython(rawData) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [path.join(__dirname, '../dataprocess/CurrAnalyze.py')]);

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

// ✅ 요약 데이터 저장
app.post('/api/summary', async (req, res) => {
  const { userId, period, summary, timestamp } = req.body;

  const table = periodToTable[period];
  if (!table) return res.status(400).json({ error: 'Invalid period' });

  try {
    for (const item of summary) {
      const { site, visitCount, dwellTimeMs } = item;

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

// ✅ 프론트에서 분석 데이터 요청 시: 분석 결과 반환
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

    const analyzed = await analyzeDataWithPython(rows); // 🔍 Python 분석
    res.json(analyzed);
  } catch (err) {
    console.error("❌ 분석 중 오류:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ 익스텐션 설치 여부 체크용 (데이터 존재 확인)
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 서버 실행 중 on port ${PORT}`));
