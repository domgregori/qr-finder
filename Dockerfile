FROM node:20-alpine AS base
ARG APP_DIR=apps/admin
WORKDIR /apps

FROM base AS deps
RUN apk add --no-cache libc6-compat 2>/dev/null || true

COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/public/package.json ./apps/public/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/admin-public-combined/package.json ./packages/admin-public-combined/package.json
COPY prisma ./prisma/

RUN npm ci

FROM base AS builder
ARG APP_DIR=apps/admin
COPY --from=deps /apps/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_MODE=standalone
ENV NEXT_FONT_GOOGLE_DOWNLOAD=0

RUN npx prisma generate
RUN npm --workspace ${APP_DIR} run build

FROM node:20-alpine AS runner
ARG APP_DIR=apps/admin
WORKDIR /apps

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_DIR=${APP_DIR}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /apps/${APP_DIR}/public ./public
COPY --from=builder /apps/prisma ./prisma
COPY --from=builder /apps/scripts ./scripts

COPY --from=builder --chown=nextjs:nodejs /apps/${APP_DIR}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /apps/${APP_DIR}/.next/static /apps/${APP_DIR}/.next/static

COPY --from=builder /apps/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /apps/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /apps/node_modules/prisma ./node_modules/prisma
COPY --from=builder /apps/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /apps/node_modules/.bin/prisma ./node_modules/.bin/prisma

RUN mkdir -p /apps/uploads
RUN chown -R nextjs:nodejs /apps/uploads
RUN chown -R nextjs:nodejs /apps/node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "if [ \"$SKIP_DB_PUSH\" = \"1\" ]; then node /apps/${APP_DIR}/server.js; else node /apps/node_modules/prisma/build/index.js db push --skip-generate && node /apps/scripts/seed-if-empty.js && node /apps/${APP_DIR}/server.js; fi"]
