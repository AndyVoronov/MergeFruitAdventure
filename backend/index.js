const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors());

// Ваши данные Supabase
const supabaseUrl = 'https://qoefhhylwyjdofvwrdcw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZWZoaHlsd3lqZG9mdndyZGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODIzNzksImV4cCI6MjA2ODE1ODM3OX0.9CexVkY2bV8gfC8ivAtPG-F0VQBUa-AYBA12CHSqTgw';
const supabase = createClient(supabaseUrl, supabaseKey);

// Добавить/обновить результат игрока
app.post('/leaderboard', async (req, res) => {
  const { id, username, score } = req.body;
  const { error } = await supabase
    .from('leaderboard')
    .upsert([{ id, username, score }]);
  if (error) return res.status(500).json({ error: error.message });

  // Получить топ-10
  const { data: top } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(10);

  // Получить место игрока
  const { count } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .gt('score', score);

  const place = (count || 0) + 1;

  res.json({ top, place });
});

// Получить топ-10 и место игрока
app.get('/leaderboard/:id', async (req, res) => {
  const { id } = req.params;
  const { data: top } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(10);

  const { data: user } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('id', id)
    .single();

  let place = null;
  if (user) {
    const { count } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .gt('score', user.score);
    place = (count || 0) + 1;
  }

  res.json({ top, place });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`)); 