#!/bin/sh
set -eu

# Falha o start se faltar config obrigatória. Um container que sobe sem API_URL
# e só quebra na primeira tela custa mais caro que um que não sobe.
: "${API_URL:?API_URL nao definida no ambiente}"
export OTEL_ENDPOINT="${OTEL_ENDPOINT:-}"

# Liste as variáveis explicitamente: sem a lista, o envsubst substitui
# qualquer $algo que apareça no arquivo.
envsubst '${API_URL} ${OTEL_ENDPOINT}' \
  < /usr/share/nginx/html/runtime-env.template.js \
  > /usr/share/nginx/html/runtime-env.js

# Sem isso o template continua servido publicamente.
rm -f /usr/share/nginx/html/runtime-env.template.js
