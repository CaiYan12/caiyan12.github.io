@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

where pnpm >nul 2>nul
if errorlevel 1 (
	echo [错误] 未找到 pnpm，请先安装 Node.js 和 pnpm。
	pause
	exit /b 1
)

if not exist "node_modules\" (
	echo [错误] 项目依赖尚未安装，请先在此目录执行 pnpm install。
	pause
	exit /b 1
)

echo 正在启动博客：http://localhost:4321/
echo 关闭此窗口或按 Ctrl+C 可停止本地服务器。
echo.

call pnpm start --open

if errorlevel 1 (
	echo.
	echo [错误] 本地服务器启动失败，请查看上方错误信息。
	pause
	exit /b 1
)

endlocal
