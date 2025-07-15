# Merge Fruit Adventure — Frontend

## Запуск в режиме разработки (dev)

```powershell
cd frontend
npm install
npx webpack serve --mode development --open
```

- Если порт 3000 занят, завершите процессы, которые его используют, или перезапустите компьютер.
- Если страница не открылась автоматически, перейдите вручную на http://localhost:3000/
- Если появляется ошибка EADDRINUSE, убедитесь, что нет других dev-серверов на этом порту.

## Production-сборка (оптимизированная)

```powershell
cd frontend
$env:NODE_ENV='production'; npm run build
```

## Запуск production-сборки локально

```powershell
cd frontend
dist\index.html
```

## Важно
- Для Windows PowerShell используйте `$env:NODE_ENV='production'; npm run build` для production-сборки.
- Для Linux/MacOS используйте `NODE_ENV=production npm run build`.
- Сервер разработки всегда стартует на http://localhost:3000/
- Все строки интерфейса должны быть локализованы через `t('key')` (см. i18next). 