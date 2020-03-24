@echo off
wmic process where "commandline like '%%--charitas-role=charitas-%%' AND name like '%%pwsh%%'" call terminate