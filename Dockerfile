FROM node:14-alpine

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

COPY . .

RUN ln -s /app/lib/cli.js /bin/canhazdb

ENTRYPOINT ["canhazdb"]
