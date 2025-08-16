#!/bin/bash
set -e

echo "Building WebGPU Shader Editor (Consolidated)..."

# Build frontend assets
echo "Building frontend..."
npm ci
npm run build

# Copy built assets to backend directory for easier deployment
echo "Organizing assets..."
mkdir -p backend/dist/assets
cp -r dist/assets/* backend/dist/assets/

# Build Go backend
echo "Building Go backend..."
cd backend
go mod tidy
go build -o shader-editor .

echo "Build complete!"
echo "Run: cd backend && ./shader-editor"
echo "Then visit: http://localhost:8080"