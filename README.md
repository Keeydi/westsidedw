# Westside Deployment Guide

This repo has:
- Frontend: React + Vite (root project)
- Backend: Express + Discord bot (`backend`)

The frontend is configured for Netlify, and the backend is configured for Render (always-on process).

## Local development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm run dev
```

## Deploy frontend to Netlify

The repository already includes:
- `netlify.toml`
- `public/_redirects` (SPA fallback)

In Netlify, set:
- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: repo root

Set environment variables in Netlify:
- `VITE_BACKEND_BASE_URL=https://<your-backend-domain>`
- `VITE_DISCORD_AUTH_URL=https://<your-backend-domain>/auth/discord/login`

## Deploy backend to Render

The repository already includes `render.yaml`, which creates:
- A web service named `westside-backend`
- A Postgres database named `westside-db`

Steps:
1. Push this repo to GitHub.
2. In Render, create a Blueprint from this repo.
3. Fill in all required env vars marked `sync: false` in `render.yaml`.
4. Confirm the service URL (for example, `https://westside-backend.onrender.com`).

Use `backend/.env.example` as a template for required backend variables.

## Required backend variables

At minimum, set:
- `FRONTEND_ORIGIN` to your Netlify URL
- `FRONTEND_SUCCESS_URL` to `https://<netlify-url>/#/members`
- `SESSION_SECRET` (strong random value)
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` to `https://<backend-url>/auth/discord/callback`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `APPROVAL_ADMIN_DISCORD_ID`
- `DATABASE_URL` (auto-wired by Blueprint from Render Postgres)

## Discord OAuth callback update

In the Discord developer portal for your app, add the production callback URL:

`https://<backend-url>/auth/discord/callback`

## Verify after deploy

1. Open backend health endpoint:
   - `https://<backend-url>/health`
2. Open Netlify frontend and verify member/auth flows.
3. Ensure CORS is correct (`FRONTEND_ORIGIN` matches frontend domain).
