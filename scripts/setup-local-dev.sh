#!/bin/bash
# Setup script for local development - databases and dependencies only
# Usage: ./scripts/setup-local-dev.sh

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICES_DIR="$PROJECT_ROOT/services"

echo "🚀 Setting up DA2 local development environment..."
echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL databases
echo "📦 Starting PostgreSQL databases..."

# Shared PostgreSQL instance
if [ "$(docker ps -aq -f name=postgres-shared)" ]; then
    echo "  ♻️  postgres-shared already exists, starting..."
    docker start postgres-shared
else
    echo "  🆕 Creating postgres-shared..."
    docker run -d \
        --name postgres-shared \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=password \
        -v "$SCRIPT_DIR/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql" \
        -p 5432:5432 \
        postgres:16-alpine
fi

echo ""
echo "⏳ Waiting for databases to be ready..."
sleep 3

# Discover all services
echo ""
echo "🔍 Discovering services..."
SERVICES=()
# Check services directory
for service_dir in "$SERVICES_DIR"/*; do
    if [ -d "$service_dir" ] && [ -f "$service_dir/package.json" ]; then
        service_name=$(basename "$service_dir")
        SERVICES+=("services/$service_name")
        echo "  ✅ Found: services/$service_name"
    fi
done
# Check api-gateway directory
if [ -d "$PROJECT_ROOT/api-gateway" ] && [ -f "$PROJECT_ROOT/api-gateway/package.json" ]; then
    SERVICES+=("api-gateway")
    echo "  ✅ Found: api-gateway"
fi

if [ ${#SERVICES[@]} -eq 0 ]; then
    echo "  ❌ No services found in $SERVICES_DIR"
    exit 1
fi

# Check .env files exist for all services
echo ""
echo "📝 Checking .env files..."

MISSING_ENV=()
for service in "${SERVICES[@]}"; do
    SERVICE_DIR="$PROJECT_ROOT/$service"
    
    if [ ! -f "$SERVICE_DIR/.env" ]; then
        MISSING_ENV+=("$service")
        echo "  ❌ Missing: $service/.env"
    else
        echo "  ✅ Found: $service/.env"
    fi
done

if [ ${#MISSING_ENV[@]} -gt 0 ]; then
    echo ""
    echo "❌ Error: Missing .env files for ${#MISSING_ENV[@]} service(s)"
    echo ""
    echo "Please create .env files for:"
    for service in "${MISSING_ENV[@]}"; do
        echo "  - $PROJECT_ROOT/$service/.env"
    done
    echo ""
    echo "💡 Tip: Copy from .env.example if available"
    exit 1
fi

# Install dependencies for all services
echo ""
echo "📦 Installing dependencies..."

for service in "${SERVICES[@]}"; do
    SERVICE_DIR="$PROJECT_ROOT/$service"
    cd "$SERVICE_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo "  📥 Installing $service..."
        npm install
    else
        echo "  ⏭️  $service dependencies already installed"
    fi
done

# Run migrations for services with Prisma
echo ""
echo "🔄 Running database migrations..."

for service in "${SERVICES[@]}"; do
    SERVICE_DIR="$PROJECT_ROOT/$service"
    
    if [ -f "$SERVICE_DIR/prisma/schema.prisma" ]; then
        echo "  📊 Migrating $service..."
        cd "$SERVICE_DIR"
        npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy
    fi
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Database info (Shared Instance):"
echo "   Identity DB:  postgresql://postgres:password@localhost:5432/identitydb"
echo ""
echo "🚀 To start services manually:"
for service in "${SERVICES[@]}"; do
    echo "   cd $PROJECT_ROOT/$service && npm run dev"
done
echo ""
echo "🛑 To stop databases:"
echo "   docker stop postgres-shared"
