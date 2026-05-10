# ---- Stage 1: build ----
FROM node:24-slim AS builder

# Build tools needed to compile sqlite3 from source.
# node:24-slim is Debian Bookworm (GLIBC 2.36). The sqlite3 v6 prebuilt binary
# requires GLIBC >= 2.38, so we must compile sqlite3 from source.
# sharp is NOT built from source — it bundles its own libvips in its prebuilt binary.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY .npmrc package*.json ./
# Install all deps normally; sharp uses its prebuilt bundled libvips (no system lib needed).
RUN npm ci
# Recompile only sqlite3 from source so it links against GLIBC 2.36 instead of
# the prebuilt binary which requires GLIBC >= 2.38.
RUN npm rebuild sqlite3 --build-from-source

COPY . .
RUN npm run build

# Prune devDeps before copying to runner stage.
RUN npm prune --omit=dev


# ---- Stage 2: runner ----
# Minimal image — no build tools. node_modules are copied pre-compiled from
# builder so the sqlite3 binary already links against GLIBC 2.36.
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/webroot ./webroot
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

CMD ["node", "dist/server-main.js"]
