# Deploy Guide

This project is split as:
- Frontend (Vite/React): deployed to GitHub Pages
- Backend (Express + Discord bot): deployed to Railway

## 1) Deploy backend to Railway

1. Create a new Railway project from this repo.
2. Railway uses `railway.toml` at repo root:
   - Build: `npm --prefix backend ci && npm --prefix backend run build`
   - Start: `npm --prefix backend run start`
3. Add backend environment variables in Railway:
   - `PORT` = `4000` (or Railway-provided value)
   - `FRONTEND_ORIGIN` = `https://<your-user>.github.io`
   - `FRONTEND_SUCCESS_URL` = `https://<your-user>.github.io/<repo>/#/members`
   - `SESSION_SECRET` = long random secret
   - `SESSION_TTL_MS` = `86400000`
   - `COOKIE_SECURE` = `true`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI` = `https://<your-railway-domain>/auth/discord/callback`
   - `DISCORD_BOT_TOKEN`
   - `APPROVAL_ADMIN_DISCORD_ID` = `1295395830865461260`
   - `APPROVAL_REQUEST_TIMEOUT_MS` = `300000`
   - `PROFILE_DB_PATH` = `data/profiles.json` (optional, default already works)
4. Deploy once and copy your Railway public URL, e.g. `https://westside-backend.up.railway.app`.

## 2) Deploy frontend to GitHub Pages

Workflow file already exists at `.github/workflows/deploy-pages.yml`.

1. In GitHub repo settings:
   - `Settings > Pages > Source`: set to **GitHub Actions**.
2. In `Settings > Secrets and variables > Actions > Variables`, add:
   - `VITE_BACKEND_BASE_URL` = your Railway URL
   - `VITE_DISCORD_AUTH_URL` = `<RAILWAY_URL>/auth/discord/login`
3. Push to `main` (or run workflow manually).
4. Frontend will be published to:
   - `https://<your-user>.github.io/<repo>/`

## 3) Discord OAuth app callback

In Discord Developer Portal OAuth2 redirect URIs, add:
- `https://<your-railway-domain>/auth/discord/callback`

## 4) Group approval behavior

- New users logging in trigger a Discord DM approval message with Accept/Decline buttons.
- Only accepted users get session login and public members visibility.
- Public `/members` shows only approved records (`isGroupMember: true`).
