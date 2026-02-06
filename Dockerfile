FROM node:20-alpine AS base
ARG APP_DIR=apps/admin

# Install dependencies only when needed
FROM base AS deps
# libc6-compat may not be available on all architectures, make it optional
RUN apk add --no-cache libc6-compat 2>/dev/null || true
WORKDIR /apps

RUN mkdir -p apps/admin apps/public packages/shared

COPY package.json yarn.lock* ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/public/package.json ./apps/public/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile
RUN yarn prisma generate

# Rebuild the source code only when needed
FROM base AS builder
ARG APP_DIR=apps/admin
WORKDIR /apps
COPY --from=deps /apps/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_MODE=standalone

# Generate Prisma client in builder stage to ensure proper initialization
RUN npx prisma generate

RUN yarn --cwd ${APP_DIR} build

# Production image, copy all the files and run next
FROM base AS runner
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

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /apps/${APP_DIR}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /apps/${APP_DIR}/.next/static /apps/${APP_DIR}/.next/static

# Copy Prisma client for runtime
COPY --from=builder /apps/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /apps/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /apps/node_modules/prisma ./node_modules/prisma
COPY --from=builder /apps/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /apps/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Ensure runtime user can write Prisma client if needed
RUN chown -R nextjs:nodejs /apps/node_modules/.prisma

# Create uploads directory for local file storage
RUN mkdir -p /apps/uploads
RUN chown nextjs:nodejs /apps/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "if [ \"$SKIP_DB_PUSH\" = \"1\" ]; then node /apps/${APP_DIR}/server.js; else node /apps/node_modules/prisma/build/index.js db push && node /apps/scripts/seed-if-empty.js && node /apps/${APP_DIR}/server.js; fi"]
