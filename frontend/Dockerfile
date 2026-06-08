# Stage 1: Build React SPA
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies manifest
COPY package*.json ./
RUN npm install --legacy-peer-deps


# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Nginx Web Runner
FROM nginx:alpine

# Copy build artifacts to Nginx docroot
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
