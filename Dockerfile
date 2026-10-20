# syntax=docker/dockerfile:1
# Multi-stage build for Railway: small standalone image + cached npm and Next build cache.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,id=s/f1ba9216-ebe2-4763-855b-acdf26a4a574-npm,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM node:24-slim AS builder
WORKDIR /app
# Railway passes service variables as build args when they are declared here.
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG GOOGLE_MAPS_API_KEY
ARG ADMIN_EMAILS
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,id=s/f1ba9216-ebe2-4763-855b-acdf26a4a574-next-cache,target=/app/.next/cache \
    npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 8080
CMD ["node", "server.js"]
