#!/bin/bash

# Cloud Native Graph Platform Startup Script

echo "================================"
echo "Cloud Native Graph Platform"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Neo4j container is running
NEO4J_CONTAINER=$(docker ps | grep neo4j | awk '{print $1}')
if [ -z "$NEO4J_CONTAINER" ]; then
    echo "Neo4j container not found. Please ensure Neo4j is running at:"
    echo "  HTTP: http://192.168.40.129:7474"
    echo "  Bolt: bolt://192.168.40.129:7687"
    echo ""
    echo "If you need to start Neo4j:"
    echo "docker run --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/neo4j@123 neo4j:latest"
    exit 1
fi

echo "Neo4j container is running: $NEO4J_CONTAINER"

# Check if kubectl is configured
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "Warning: kubectl is not configured or cannot connect to cluster"
    echo "Please ensure your kubeconfig is properly configured"
fi

# Backend setup
echo ""
echo "Setting up backend..."
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Create logs directory
mkdir -p logs

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env configuration file..."
    cp .env.example .env
    echo "Please edit backend/.env with your configuration if needed"
fi

# Frontend setup
echo ""
echo "Setting up frontend..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Go back to root
cd ..

# Start both backend and frontend
echo ""
echo "Starting application..."
echo "Backend will run on: http://localhost:3001"
echo "Frontend will run on: http://localhost:3000"
echo ""

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
cd backend
echo "Starting backend server..."
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
cd ../frontend
echo "Starting frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "Application is starting..."
echo "================================"
echo ""
echo "Access the application at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait