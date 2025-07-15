const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к PostgreSQL через Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Получить топ игроков
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, score FROM leaderboard ORDER BY score DESC LIMIT 20');
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('Ошибка при получении лидерборда:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить/обновить результат игрока
app.post('/api/leaderboard', async (req, res) => {
  const { userId, username, score } = req.body;
  if (!userId || !username || typeof score !== 'number') {
    return res.status(400).json({ error: 'Некорректные данные' });
  }
  try {
    // upsert: если игрок уже есть — обновить, иначе вставить
    await pool.query(
      `INSERT INTO leaderboard (id, username, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, score = GREATEST(leaderboard.score, EXCLUDED.score)`,
      [userId, username, score]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Ошибка при добавлении результата:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Заглушка для прогресса игрока
app.get('/api/progress/:userId', (req, res) => {
  res.json({ userId: req.params.userId, progress: {} });
});

// Заглушка для обновления прогресса
app.post('/api/progress/:userId', (req, res) => {
  res.json({ status: 'ok', data: req.body });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
}); 