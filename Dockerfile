FROM node:20-alpine
WORKDIR /app

ARG BACKEND_URL=https://common-backend.ayux.in/api
ENV VITE_BACKEND_URL=${BACKEND_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 8011
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8011"]