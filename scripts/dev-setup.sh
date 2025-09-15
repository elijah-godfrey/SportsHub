#!/bin/bash

echo "🚀 Setting up SportsHub development environment with Docker"

# Check if backend/.env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  backend/.env file not found. Creating from template..."
    cp backend/env.example backend/.env
    echo "✅ Created backend/.env file from template"
    echo "⚠️  Please edit backend/.env file with your actual Google OAuth credentials!"
else
    echo "✅ backend/.env file exists"
fi

# Check if Docker daemon is running and accessible
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not accessible. Please check:"
    echo "   1. Docker Desktop is running"
    echo "   2. Your user is in the docker group: sudo usermod -aG docker $USER"
    echo "   3. You may need to restart your terminal/WSL session"
    echo "   4. Try: sudo chmod 666 /var/run/docker.sock (temporary fix)"
    exit 1
fi

# Build and start containers
echo "🐳 Starting Docker containers..."
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 15

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Containers failed to start. Check logs:"
    docker-compose logs
    exit 1
fi

# Run database migrations inside the container
echo "🗄️  Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy

echo "🎉 Development environment is ready!"
echo ""
echo "📋 Services running:"
echo "   - Backend API: http://localhost:5000"
echo "   - PostgreSQL: localhost:5432"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart backend: docker-compose restart backend"
echo "   - Access database: docker-compose exec postgres psql -U sportshub -d sportshub"