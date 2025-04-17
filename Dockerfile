FROM node:22-alpine

RUN mkdir /app
WORKDIR /app

RUN apk add ffmpeg

COPY package.json .
COPY server.js .

RUN npm install

ENTRYPOINT [ "node", "/app/server.js" ]