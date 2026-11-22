# Build the SPA, then serve the static files with Nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Strict, reproducible install first. If npm reports the lockfile out of sync (a known quirk with
# optional native-binary packages on Alpine), fall back to a normal install that repairs the tree.
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/healthz || exit 1
