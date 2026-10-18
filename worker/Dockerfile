FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src ./src
# Los avisos nacen APAGADOS: se encienden con WHATSAPP_ALERTS_ENABLED=true (ver LEEME.md).
ENV WHATSAPP_ALERTS_ENABLED=false
USER node
HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 CMD ["node", "src/healthcheck.js"]
CMD ["node", "src/main.js"]
