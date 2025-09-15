@echo off
echo 🚀 Setting up SportsHub development environment with Docker

REM
if not exist backend\.env (
    echo ⚠️  backend/.env file not found. Creating from template...
    copy backend\env.example backend\.env
    echo ✅ Created backend/.env file from template
    echo ⚠️  Please edit backend/.env file with your actual Google OAuth credentials!
) else (
    echo ✅ backend/.env file exists
)

REM
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker daemon is not accessible. Please check:
    echo    1. Docker Desktop is running
    echo    2. Restart Docker Desktop if needed
    echo    3. You may need to restart your terminal
    pause
    exit /b 1
)

REM Build and start containers
echo 🐳 Starting Docker containers...
docker-compose up -d --build

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 15 /nobreak > nul

REM Check if containers are running
docker-compose ps | findstr "Up" >nul
if errorlevel 1 (
    echo ❌ Containers failed to start. Check logs:
    docker-compose logs
    pause
    exit /b 1
)

REM Run database migrations
echo 🗄️  Running database migrations...
docker-compose exec -T backend npx prisma migrate deploy

echo 🎉 Development environment is ready!
echo.
echo 📋 Services running:
echo    - Backend API: http://localhost:5000
echo    - PostgreSQL: localhost:5432
echo.
echo 🔧 Useful commands:
echo    - View logs: docker-compose logs -f
echo    - Stop services: docker-compose down
echo    - Restart backend: docker-compose restart backend
echo    - Access database: docker-compose exec postgres psql -U sportshub -d sportshub

pause




