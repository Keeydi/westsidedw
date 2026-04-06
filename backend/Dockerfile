FROM node:20-alpine AS build
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/backend/dist ./dist

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
