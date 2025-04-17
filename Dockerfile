FROM node:22-alpine

RUN mkdir /app
WORKDIR /app

RUN apk add ffmpeg && \
    npm install "express"

COPY server.js /app/server.js

ENTRYPOINT [ "node", "/app/server.js" ]