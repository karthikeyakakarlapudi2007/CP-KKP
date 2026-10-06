# Express + Socket.IO API
# full Debian image: ships OpenSSL, which Prisma's query engine needs
FROM node:22
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
# apply migrations + idempotent seed (tables 1–10, menu only when empty), then start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"]
