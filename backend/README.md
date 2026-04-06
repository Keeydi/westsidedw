# Westside Backend (Discord Auth + Bot)

## 1) Configure environment

Copy `backend/.env.example` to `backend/.env` and fill values.

Required:
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (must match Discord Developer Portal exactly)
- `SESSION_SECRET`

Optional:
- `DISCORD_BOT_TOKEN` (if omitted, bot stays disabled)

## 2) Discord OAuth setup

In Discord Developer Portal:
- Add redirect URL: `http://localhost:4000/auth/discord/callback`
- OAuth scopes used: `identify email`

## 3) Run backend

```bash
npm --prefix backend run dev
```

## 4) Connect frontend login button

In root `.env`, set:

```bash
VITE_DISCORD_AUTH_URL=http://localhost:4000/auth/discord/login
```

Run frontend:

```bash
npm run dev
```

## Routes

- `GET /health`
- `GET /bot/status`
- `GET /auth/discord/login`
- `GET /auth/discord/callback`
- `GET /auth/me`
- `POST /auth/logout`
