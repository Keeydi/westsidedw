# Deploy Guide

This project is split as:
- Frontend (Vite/React): deployed to GitHub Pages
- Backend (Express + Discord bot): deployed to Fly.io

## 1) Deploy backend to Fly.io

1. Install Fly CLI and login:
   - `flyctl auth login`
2. Create app once (or choose a different unique name if needed):
   - `flyctl apps create westsidedw-backend`
3. This repo includes:
   - `fly.toml` (service/runtime config)
   - `backend/Dockerfile` (build/runtime image)
4. Set backend secrets/env on Fly:
   - `DATABASE_URL` = Postgres connection string (recommended, enables persistent profiles)
   - `FRONTEND_ORIGIN` = `https://<your-user>.github.io`
   - `FRONTEND_SUCCESS_URL` = `https://<your-user>.github.io/<repo>/#/members`
   - `SESSION_SECRET` = long random secret
   - `SESSION_TTL_MS` = `86400000`
   - `COOKIE_SECURE` = `true`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI` = `https://<your-fly-domain>/auth/discord/callback`
   - `DISCORD_BOT_TOKEN`
   - `APPROVAL_ADMIN_DISCORD_ID` = `1295395830865461260`
5. Set secrets with one command (example):
   - `flyctl secrets set DATABASE_URL=... FRONTEND_ORIGIN=... FRONTEND_SUCCESS_URL=... SESSION_SECRET=... DISCORD_CLIENT_ID=... DISCORD_CLIENT_SECRET=... DISCORD_REDIRECT_URI=... DISCORD_BOT_TOKEN=... APPROVAL_ADMIN_DISCORD_ID=... --app westsidedw-backend`
6. Deploy:
   - `flyctl deploy --remote-only`
7. Your backend URL will be:
   - `https://westsidedw-backend.fly.dev`

## 2) Deploy frontend to GitHub Pages

Workflow file already exists at `.github/workflows/deploy-pages.yml`.

1. In GitHub repo settings:
   - `Settings > Pages > Source`: set to **GitHub Actions**.
2. In `Settings > Secrets and variables > Actions > Variables`, add:
   - `VITE_BACKEND_BASE_URL` = your Fly URL
   - `VITE_DISCORD_AUTH_URL` = `<FLY_URL>/auth/discord/login`
3. Push to `main` (or run workflow manually).
4. Frontend will be published to:
   - `https://<your-user>.github.io/<repo>/`

## 3) Discord OAuth app callback

In Discord Developer Portal OAuth2 redirect URIs, add:
- `https://<your-fly-domain>/auth/discord/callback`

## 4) Group approval behavior

- New users logging in trigger a Discord DM approval message with Accept/Decline buttons.
- Only accepted users get session login and public members visibility.
- Public `/members` shows only approved records (`isGroupMember: true`).
