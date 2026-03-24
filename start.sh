#!/bin/bash
echo "🚀 Starting Tax Master AI..."

# Check if .env exists
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "⚠️  Created backend/.env - please add your ANTHROPIC_API_KEY"
    echo "   Edit: backend/.env"
    echo ""
fi

# Install backend deps if needed
if [ ! -d backend/venv ]; then
    echo "📦 Setting up Python environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    source backend/venv/bin/activate
fi

# Install frontend deps if needed
if [ ! -d frontend/node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "✅ Starting servers..."
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""

# Start backend
cd backend && python main.py &
BACKEND_PID=$!

# Start frontend
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Wait for both
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
