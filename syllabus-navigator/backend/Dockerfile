FROM node:20-alpine AS build

WORKDIR /app

COPY backend/package.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY backend/tsconfig.json ./
COPY backend/src ./src/

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev && npx prisma generate

COPY --from=build /app/dist ./dist/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
