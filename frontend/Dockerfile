# Multi-Stage Production Dockerfile for Svelte 5 Frontend
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN bun install

COPY . .
RUN bun run build

# Step 2: Serve static production assets via ultra-fast Nginx Alpine
FROM nginx:1.27-alpine AS runner

# Copy customized SPA nginx config
COPY <<-'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
    }

    # SPA History API routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
