# ---------- Stage 1: Build ----------
FROM node:lts AS builder

WORKDIR /app

# package.json is copied on its own, before the source, so Docker can cache
# the install layer. Editing a component then does not re-run npm install.
COPY package*.json ./
RUN npm install

COPY . .

# Prisma Client is GENERATED code, not shipped with the package. It has to
# exist before `next build`, or every route importing @prisma/client fails
# to compile.
RUN npx prisma generate

RUN npm run build

# ---------- Stage 2: Production ----------
FROM node:lts

# tini is a tiny init process, so `docker stop` terminates Node cleanly
# instead of waiting out a ten second timeout.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Only the build output is carried across - source files and build caches
# stay behind in the builder stage.
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/bin/sh", "/app/entrypoint.sh"]
