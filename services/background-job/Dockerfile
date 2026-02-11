FROM node:20.11.0

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

WORKDIR /app/services/background-job

ENTRYPOINT ["npm", "run", "start"]
