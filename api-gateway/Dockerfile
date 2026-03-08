# Multi-stage build for Node.js/TypeScript API Gateway
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies for runtime image
RUN npm prune --omit=dev

# Production stage
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies and built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port (adjust as needed)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
