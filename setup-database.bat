@echo off
REM One-time database setup for Mini ERP + CRM.
REM Double-click this file. It regenerates the Prisma client, resets the
REM database (drops + recreates all tables), and seeds the 4 login users.
REM WARNING: this deletes all existing rows in the database.

cd /d "%~dp0"

echo ============================================================
echo  Mini ERP + CRM - database setup
echo  (regenerate client, reset tables, seed 4 users)
echo ============================================================
echo.

call npm run db:setup

echo.
echo ============================================================
echo  Done. Scroll up to check for errors.
echo  On success you should see "Database reset successful"
echo  and the seed output listing 4 users.
echo.
echo  Next: start the app with  npm run dev
echo  Then log in as  admin@erp.test  /  password123
echo ============================================================
pause
