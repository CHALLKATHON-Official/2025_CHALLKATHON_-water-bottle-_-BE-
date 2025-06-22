const express = require('express');
const cors = require('cors');
const db = require('./dbconfig'); // ✅ dbconfig.js에서 DB 연결 가져오기

const app = express();
app.use(cors());
app.use(express.json());

// ✅ period에 따른 테이블 이름 매핑
const periodToTable = {
  '7days': 'site_summary_7days',
  '30days': 'site_summary_30days',
  '90days': 'site_summary_90days',
};

app.post('/api/summary', async (req, res) => {
  const { userId, period, summary, timestamp } = req.body;

  const table = periodToTable[period];
  if (!table) {
    return res.status(400).json({ error: 'Invalid period' });
  }

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 서버 실행 중 on port ${PORT}`));
