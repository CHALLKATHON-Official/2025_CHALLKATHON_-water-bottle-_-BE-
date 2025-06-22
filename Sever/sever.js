const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors()); // ✅ 크롬 확장에서 접속 가능하게 CORS 허용
app.use(express.json());

// 테스트용 엔드포인트
app.post('/api/summary', (req, res) => {
  console.log('📩 서버 수신:', req.body);
  res.status(200).send({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 서버 실행 중 on port ${PORT}`));
