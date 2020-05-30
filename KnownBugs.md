##Non Critical
- Launching the exe from a cmd -> powershell elevated or non elevated prompt allows one to bypass the systray check (May 29th)

##Critical
- Clicking the start button really fast on older versions of Charitas is undefined behavior and is not expected. Many bugs may occur (May 29th)
- Behavior on multi-cpu systems is not tested (May 29th)
- Behavior on multi-gpu systems is not tested (May 29th)
- Manually elevating miners while the GUI is not elevated stops miner closing behavior (May 29th)