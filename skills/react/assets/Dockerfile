# syntax=docker/dockerfile:1

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app

# O subpath é propriedade da aplicação, não do ambiente: entra no build.
# Sempre com barra final — /poc-01/ — ou o alias do Nginx não resolve.
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- serve ----
FROM nginx:alpine

ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}

# public/runtime-env.template.js sai em dist/ pelo próprio Vite.
COPY --from=build /app/dist /usr/share/nginx/html

# A imagem nginx aplica envsubst sozinha no que estiver em /etc/nginx/templates.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# /docker-entrypoint.d roda antes do Nginx subir; 40 vem depois do 20 nativo.
COPY docker/40-runtime-env.sh /docker-entrypoint.d/40-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-env.sh

EXPOSE 80
