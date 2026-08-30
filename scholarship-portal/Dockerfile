# Multi-stage build for ECS Fargate. Builds and runs on the same Debian base throughout so
# the Prisma query engine binary generated during the build always matches the runtime OS —
# no binaryTargets pinning needed, and no risk of a developer's own machine (e.g. macOS/arm64)
# producing a binary that doesn't run in the container.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No postinstall hook generates the Prisma client — must run explicitly before the build,
# since every Server Component/Action in this app imports from the generated output.
RUN npx prisma generate
# DATABASE_URL isn't read at build time (no data fetching happens during `next build` for
# this app's route set), but Prisma's own generate step and Next's build both expect *a*
# value to exist so validation doesn't fail — a placeholder is fine here, the real one is
# supplied at container runtime by the ECS task definition.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Runs as a non-root user — standard container hardening, no reason for the Node process
# inside the container to run as root.
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
# `node server.js` is the standalone-output entrypoint Next.js generates — not `npm start`,
# which would look for a full node_modules tree this image deliberately doesn't carry.
CMD ["node", "server.js"]
