if exist "Bin\Cryptonight-Claymore\*_log.txt" del "Bin\Cryptonight-Claymore\*_log.txt"
if exist "Bin\Equihash-Claymore\*_log.txt" del "Bin\Equihash-Claymore\*_log.txt"
if exist "Bin\Ethash-Claymore\*_log.txt" del "Bin\Ethash-Claymore\*_log.txt"
for /f "skip=1 eol=: delims=" %%F in ('dir /b /o-d "Logs\*.txt"') do @del "Logs\%%F"

if exist "Stats\*_HashRate.txt" del "Stats\*_HashRate.txt"

if exist "Stats\*_PowerUsage.txt" del "Stats\*_PowerUsage.txt"
if exist "Stats\PowerUsage\*_PowerUsage.txt" del "Stats\PowerUsage\*_PowerUsage.txt"

if exist "Stats\*Profit.txt" del "Stats\*Profit.txt"
if exist "Stats\Profit\*Profit.txt" del "Stats\Profit\*Profit.txt"

ECHO Reset all stats, profits, logs, and power usage