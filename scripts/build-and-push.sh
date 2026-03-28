#!/bin/bash
# Build and push Docker images to Docker Hub
# Usage: ./scripts/build-and-push.sh [tag]
# Example: ./scripts/build-and-push.sh v1.0.0

set -e

# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Default tag is 'latest' if not provided
TAG=${1:-latest}
DOCKER_USERNAME="uqtri"

echo "🐳 Building and pushing Docker images with tag: $TAG"
echo "📦 Docker Hub username: $DOCKER_USERNAME"
echo ""

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username: $DOCKER_USERNAME"; then
    echo "⚠️  Not logged in to Docker Hub. Please run:"
    echo "   docker login"
    exit 1
fi

# Build and push identity-service
echo "🔨 Building identity-service..."
cd "$PROJECT_ROOT"
docker build -f services/identity-service/Dockerfile -t $DOCKER_USERNAME/identity-service:$TAG .
docker tag $DOCKER_USERNAME/identity-service:$TAG $DOCKER_USERNAME/identity-service:latest
echo "📤 Pushing identity-service..."
docker push $DOCKER_USERNAME/identity-service:$TAG
docker push $DOCKER_USERNAME/identity-service:latest
echo "✅ identity-service pushed successfully"
echo ""

# Build and push api-gateway (if exists)
if [ -f "$PROJECT_ROOT/api-gateway/Dockerfile" ]; then
    echo "🔨 Building api-gateway..."
    cd "$PROJECT_ROOT"
    docker build -f api-gateway/Dockerfile -t $DOCKER_USERNAME/api-gateway:$TAG .
    docker tag $DOCKER_USERNAME/api-gateway:$TAG $DOCKER_USERNAME/api-gateway:latest
    echo "📤 Pushing api-gateway..."
    docker push $DOCKER_USERNAME/api-gateway:$TAG
    docker push $DOCKER_USERNAME/api-gateway:latest
    echo "✅ api-gateway pushed successfully"
    echo ""
fi

echo "🎉 All images built and pushed successfully!"
echo ""
echo "📋 Pushed images:"
echo "   - $DOCKER_USERNAME/identity-service:$TAG"
echo "   - $DOCKER_USERNAME/identity-service:latest"
if [ -f "$PROJECT_ROOT/api-gateway/Dockerfile" ]; then
    echo "   - $DOCKER_USERNAME/api-gateway:$TAG"
    echo "   - $DOCKER_USERNAME/api-gateway:latest"
fi
echo ""
echo "🚀 You can now deploy using Helm with these images!"
