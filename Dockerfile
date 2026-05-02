FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads/meetings uploads/profile-pictures uploads/documents

EXPOSE 8080

CMD ["node", "src/index.js"]
