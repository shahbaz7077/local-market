FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 && npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]