FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN corepack prepare pnpm@10.11.0 --activate && pnpm install --frozen-lockfile
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4174 DB_PATH=/app/data/learning.sqlite
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/data/python-course.json ./src/data/python-course.json
COPY src/data/adventure-quests.json ./src/data/adventure-quests.json
RUN mkdir /app/data && chown -R node:node /app
USER node
EXPOSE 4174
CMD ["node", "server/index.mjs"]
