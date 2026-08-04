# Step 1: Build the React application using Node
FROM node:20-alpine AS builder

# Accept build argument for backend URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build the application
COPY . .
RUN npm run build

# Step 2: Serve the application using NGINX
FROM nginx:alpine

# Copy built files from builder step
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom NGINX configuration for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
