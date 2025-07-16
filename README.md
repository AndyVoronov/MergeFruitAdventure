# MergeFruitAdventure — Архитектура и деплой

## Общая структура

- **Фронтенд**: размещён на [Vercel](https://vercel.com/), написан на TypeScript + Phaser, собирается Webpack'ом из папки `frontend/`.
- **Бэкенд**: размещён на [Render](https://render.com/), Node.js + Express, код в папке `backend/`. Отвечает за работу с таблицей лидеров.
- **База данных**: [Supabase](https://supabase.com/) (PostgreSQL), хранит таблицу лидеров.
- **Интеграция с Telegram Mini App**: игра запускается через Web App кнопку в Telegram-боте, поддерживает авторизацию пользователя Telegram.

---

## Фронтенд (Vercel)
- Исходный код: `frontend/`
- Сборка: `npm run build` (Webpack)
- Папка вывода: `dist/`
- Деплой: Vercel автоматически подтягивает изменения из GitHub и пересобирает проект.
- URL для запуска Mini App: `https://merge-fruit-adventure.vercel.app/`
- Взаимодействует с backend через публичный API Render.

## Бэкенд (Render)
- Исходный код: `backend/`
- Сервер: Node.js + Express
- Основные эндпоинты:
  - `POST /leaderboard` — сохранить результат игрока (только если новый счёт больше предыдущего)
  - `GET /leaderboard/:id` — получить топ-10 и место игрока
- Деплой: Render автоматически подтягивает изменения из GitHub и перезапускает сервер.
- URL: `https://mergefruitadventure.onrender.com/`
- Использует Supabase для хранения и получения данных.

## База данных (Supabase)
- Таблица: `leaderboard`
  - `id` (TEXT, PRIMARY KEY) — идентификатор пользователя Telegram
  - `username` (TEXT) — ник или имя пользователя
  - `score` (INTEGER) — лучший результат
- Доступ к базе через Supabase API (анонимный ключ для backend).

## Интеграция с Telegram Mini App
- В @BotFather настроена Web App Button с URL на Vercel.
- При запуске через Telegram WebApp API передаёт данные пользователя (id, username, имя).
- Фронтенд отправляет результат и получает топ через backend.
- В таблице лидеров отображается ник/имя пользователя и его место.

---

## Как работает
1. Пользователь запускает игру через кнопку в Telegram-боте.
2. Фронтенд получает данные пользователя через Telegram WebApp API.
3. После окончания игры результат отправляется на backend (Render).
4. Backend сохраняет лучший результат в Supabase и возвращает топ-10 и место игрока.
5. Фронтенд отображает таблицу лидеров и место пользователя.

---

## Важно
- В браузере и обычном Telegram Desktop Mini App API не работает — тестировать только через Telegram на телефоне или Beta Desktop.
- Для корректной работы авторизации Mini App должна быть опубликована и запущена через Web App кнопку в Telegram-боте. 