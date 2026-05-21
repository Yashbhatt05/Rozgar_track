@echo off
echo ========================================
echo  Job Intelligence Platform
echo ========================================
echo.
echo Starting backend (pipeline + API) and frontend concurrently...
echo.
echo   API Server: http://localhost:3001
echo   Frontend:   http://localhost:5173
echo.
echo Prerequisites:
echo   - PostgreSQL running with database schema created
echo   - Run "cd backend ^&^& npm install" once
echo   - Run "cd frontend ^&^& npm install" once
echo.
echo NOTE: The backend pipeline takes ~30-60 seconds to run
echo before the API server becomes available.
echo.
echo ========================================
echo.

npm run dev
