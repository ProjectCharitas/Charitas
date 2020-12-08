##Non Critical
- Launching the exe from a cmd -> powershell elevated or non elevated prompt allows one to bypass the systray check (5/29/20)
- Manually launching the startup miners will not activate the spinner on the gui page (5/30/20)

##Critical
- Clicking the start button really fast on older versions of Charitas is undefined behavior and is not expected. Many bugs may occur (5/29/20)
- Behavior on multi-cpu systems is not tested (5/29/20)
- Behavior on multi-gpu systems is not tested (5/29/20)
- Manually elevating miners while the GUI is not elevated stops miner closing behavior (5/29/20)
- Electron sometimes does not initialize correctly when launching from a screen off and sleep enabled behavior (8/14/20)