FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public

RUN mkdir -p /app/public/uploads && chown -R node:node /app
USER node

EXPOSE 4000
CMD ["node", "src/server.js"]
