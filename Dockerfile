# Single service. Docker (image build) yes — docker-compose (bundled DB/Redis) NO.
# Postgres + Redis come from OpenLander managed services your agent creates.
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 8080
CMD ["node", "src/server.js"]
