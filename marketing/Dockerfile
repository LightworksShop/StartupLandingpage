FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY marketing ./marketing
COPY server.js index.html 404.html impressum.html datenschutz.html app.js content.js legal.js styles.css robots.txt sitemap.xml ./
COPY assets ./assets
RUN npm run build:marketing \
    && npm prune --omit=dev \
    && mkdir -p /app/marketing/var/media \
    && chown -R node:node /app/marketing/var

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
USER node
EXPOSE 3000
CMD ["node", "--import", "tsx", "server.js"]
