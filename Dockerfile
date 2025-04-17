FROM node:22-alpine

RUN npm install --global "@warren-bank/hls-proxy"

ENTRYPOINT [ "hlsd" ]