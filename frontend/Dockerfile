# Multi-stage so the runtime image carries no Node toolchain.
#
# The runtime is nginx rather than `vite preview` on purpose: the bundle is
# fully static, and vite is a devDependency that isn't installed here at all.
# It also means the image behaves like the Vercel deployment — static files with
# an SPA fallback — instead of a second, subtly different dev code path.

FROM node:20-alpine AS build
WORKDIR /app

# Vite inlines env vars at build time, so this has to be a build argument. A
# runtime environment variable would arrive after the bundle was already built
# and be silently ignored.
ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Copy manifests first so the dependency layer is only rebuilt when they change.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Listen on 5173 to match the port the compose file and README already use.
RUN printf '%s\n' \
    'server {' \
    '  listen 5173;' \
    '  root /usr/share/nginx/html;' \
    '  index index.html;' \
    '  # Client-side routing: a hard refresh on /login or /dashboard must serve' \
    '  # the app, not 404.' \
    '  location / { try_files $uri $uri/ /index.html; }' \
    '  # Fingerprinted assets never change under the same name, so they can be' \
    '  # cached hard while index.html must not be.' \
    '  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }' \
    '  location = /index.html { add_header Cache-Control "no-cache"; }' \
    '}' \
    > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:5173/ >/dev/null || exit 1
