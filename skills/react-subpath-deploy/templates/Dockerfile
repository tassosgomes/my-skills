# ---- Build Stage ----
FROM node:20-alpine AS build

ARG BASE_PATH=/app/
ENV VITE_BASE_PATH=${BASE_PATH}

WORKDIR /app

# Instalar dependências primeiro (cache de camada Docker)
COPY package*.json ./
RUN npm ci

# Copiar código-fonte e buildar
COPY . .
RUN npm run build

# ---- Serve Stage ----
FROM nginx:alpine

ARG BASE_PATH=/app/
ENV BASE_PATH=${BASE_PATH}

# Copiar artefatos do build
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx template com subpath dinâmico
# A imagem nginx:alpine executa envsubst automaticamente em /etc/nginx/templates/
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

# Build:
#   docker build --build-arg BASE_PATH=/poc-01/ -t meu-app:latest .
#
# Run local:
#   docker run -p 8080:80 meu-app:latest
#   Acesse: http://localhost:8080/poc-01/