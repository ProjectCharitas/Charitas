const {
   spawn,
   exec,
   execSync
} = require("child_process");

let miner;
let logger;
let state = false;

const searchForOpenMiners = () => {
   exec(`wmic process WHERE "CommandLine LIKE '%--charitas-role=charitas-miner%' AND Name LIKE '%pwsh%'" get ProcessId | more +1`, (err, stdout, stderr) => {
      if (err) console.error(err);
      let procs = stdout.trim().split("\n").filter(p => p != "").map(p => p.trim());
      state = procs.length > 0;
      if (procs.length > 0) {
         if (procs.length == 1) {
            miner = {
               kill: function () {
                  exec("taskkill /PID " + procs[0]);
               }
            }
            toggleSpinner();
         } else {
            console.error("Multiple Miners found: " + procs);
            alert("Multiple Miners Detected. Closing all open miners.\nThis should not occur.\nPlease reach out to us on social media or contact us at help@charitas.co");
            killAllOpen();
         }
      }
   });
}

const searchForOpenLoggers = () => {
   exec(`wmic process WHERE 'CommandLine LIKE "%--charitas-role=charitas-log%" AND Name LIKE "%pwsh%"' GET ProcessId | more +1`, (err, stdout, stderr) => {
      let procs = stdout.trim().split("\n").filter(p => p != "").map(p => p.trim());
      state = procs.length > 0;
      if (procs.length > 0) {
         if (procs.length == 1) {
            logger = {
               kill: function () {
                  exec("taskkill /PID " + procs[0]);
               }
            }
            toggleSpinner();
         } else {
            console.error("Multiple Loggers found: " + procs);
            alert("Multiple Loggers Detected. Closing all open log files.\nThis should not occur.\nPlease reach out to us on social media or contact us at help@charitas.co");
            killAllOpen();
         }
      }
   });
}

const searchForOpen = () => {
   searchForOpenMiners();
   searchForOpenLoggers();
}

const killAllOpen = () => {
   exec(`wmic process where "commandline like '%--charitas-role=charitas-%' AND name like '%pwsh%'" call terminate`, (err, stdout, stderr) => {
      if (err) console.error(err);
   });
}

const toggleSpinner = () => {
   [document.getElementById('mine-button').children[3], document.getElementById('mine-button').children[4]].forEach(c => c.setAttribute('class', state ? 'on' : 'off'));
   setTimeout(() => {
      document.getElementById('status-text').textContent = ""
   }, Math.floor(Math.random() * (1050 - 750 + 1)) + 550);
}

const clicked = (e) => {
   state = !state;
   if (state) { //miner turned on
      document.getElementById('status-text').textContent = "Starting Miner..."
      if (remote.getGlobal('isLaptop')) {
         startMining(true);
      } else {
         startMining(false);
      }
   } else { //miner turned off
      if (typeof miner.kill == 'function') {
         document.getElementById('status-text').textContent = "Stopping Miner..."
         stopMining();
         document.getElementById("anim-off").innerHTML = `
       @keyframes unspin {
           from {
               transform: rotate(${-1 * (Math.asin(getComputedStyle(document.getElementById("arrows"))['transform'].replace(/[a-z()]/g,"").split(",")[1]) * 180/Math.PI)}deg);
           }
           to {
               transform: rotate(0deg);
           }
       }
       `;
         toggleSpinner();
      } else {
         clicked(e)
      }
   }
}

const allowedToMine = () => {
   if (!opts['laptop']) {
      return true;
   }
   let batteryStatus = execSync(`wmic path win32_battery get BatteryStatus`).toString().trim().split('\n')[1];
   switch (batteryStatus) {
      case "1":
      case "4":
      case "5":
      case "8":
      case "9":
         return false;
      case "2":
      case "3":
      case "6":
      case "7":
      case "10":
      case "11":
         return true;
      default:
         return true;
   }
}

const startMining = (laptop) => {
   if (!laptop || (laptop && allowedToMine())) {
      let startMiners = new Promise((resolve, reject) => {
         let startup = spawn(path.join(__dirname, `../miner/Charitas.bat`));
         startup.stdout.on('data', data => resolve(data))
         startup.stderr.on('data', errdata => {
            if (data.toString().includes('pwsh')) {
               document.getElementById('powershell-alert').style.display = 'block';
            }
            reject(errdata)
         });
      }).then((started) => {
         if(started.toString().includes("yea they opened")){
            searchForOpen();
         }
         else {
            console.log(stdout.toString());
         }
      }).catch((error) => {
         console.error(error);
      })
   } else {
      miner = {
         kill: "No miner was opened"
      }
      logger = {
         kill: "No logger was opened"
      }
      document.getElementById('laptop-alert').style.display = "block"
   }
}

const stopMining = () => {
   miner.kill();
   logger.kill();
}