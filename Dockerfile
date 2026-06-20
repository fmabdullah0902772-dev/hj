FROM node:20-slim

RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 8000

CMD ["npm", "start"]