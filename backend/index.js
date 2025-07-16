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

console.log('=== Backend starting ===');

// Добавить/обновить результат игрока
app.post('/leaderboard', async (req, res) => {
  const { id, username, score } = req.body;

  // Получаем текущий рекорд
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('score')
    .eq('id', id)
    .single();

  // Сохраняем только если новый счёт больше
  if (!existing || score > existing.score) {
    const { error } = await supabase
      .from('leaderboard')
      .upsert([{ id, username, score }]);
    if (error) return res.status(500).json({ error: error.message });
  }

  // --- Увеличиваем rounds_count для пользователя ---
  const { data: user, error: getUserError } = await supabase
    .from('users')
    .select('rounds_count')
    .eq('id', id)
    .single();
  if (!getUserError && user) {
    await supabase
      .from('users')
      .update({ rounds_count: user.rounds_count + 1 })
      .eq('id', id);
  }

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

// --- Новый endpoint: регистрация входа пользователя ---
app.post('/user-visit', async (req, res) => {
  try {
    const { id, username } = req.body;
    if (!id || !username) return res.status(400).json({ error: 'id и username обязательны' });
    // Проверяем, есть ли пользователь
    const { data: user, error: getError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (getError && getError.code !== 'PGRST116') {
      // Не ошибка "Not found"
      console.error('user-visit getError:', getError);
      return res.status(500).json({ error: getError.message });
    }
    if (user) {
      // Обновляем visits_count и last_visit
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username,
          last_visit: new Date().toISOString(),
          visits_count: user.visits_count + 1
        })
        .eq('id', id);
      if (updateError) {
        console.error('user-visit updateError:', updateError);
        return res.status(500).json({ error: updateError.message });
      }
      return res.json({ status: 'updated' });
    } else {
      // Создаём нового пользователя
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id, username, last_visit: new Date().toISOString(), visits_count: 1, rounds_count: 0 }]);
      if (insertError) {
        console.error('user-visit insertError:', insertError);
        return res.status(500).json({ error: insertError.message });
      }
      return res.json({ status: 'created' });
    }
  } catch (e) {
    console.error('user-visit error:', e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});