FROM node:22-alpine

WORKDIR /app

# Install utilities for container healthchecks
RUN apk add --no-cache curl wget

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
