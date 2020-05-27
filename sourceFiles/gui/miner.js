const {
   exec,
   execSync,
   spawn
} = require('child_process');

const path = require('path');
const remote = require('electron').remote;

let miner, logger;
let cooldown = false;
const COOLDOWN_TIME = 500;

const searchForOpen = () => {
   return new Promise((resolve, reject) => {
      checkForOpenMiners().then((foundMiner) => {
         if (typeof foundMiner == "string") {
            miner = null;
         } else if (typeof foundMiner == "object") {
            miner = foundMiner;
         }
         checkForOpenLoggers().then((foundLogger) => {
            if (typeof foundLogger == "string") {
               logger = null;
            } else if (typeof foundLogger == "object") {
               logger = foundLogger;
            }
            toggleUI(miner !== null);
            resolve(miner, logger);
         })
      }).catch((err) => {
         console.error(err);
         if (err.includes('Multiple')) {
            killAllOpen().then((closedMiner, closedLogger) => {
               resolve(miner, logger);
            }).catch((err) => reject(err));
         } else if (err.includes("No Instance(s) Available")) {
            toggleUI(false);
            resolve(null, null);
         }
         reject(err);
      })
   });
}

const checkForOpenMiners = () => {
   return new Promise((resolve, reject) => {
      exec(`wmic process WHERE "CommandLine LIKE '%--charitas-role=charitas-miner%' AND Name LIKE '%pwsh%'" get ProcessId | more +1`, (err, stdout, stderr) => {
         if (err) {
            reject(err);
         } else if (stderr) {
            reject(stderr);
         } else {
            let procs = stdout.trim().split("\n").filter(p => p != "").map(p => p.trim());
            if (procs.length > 1) {
               reject("Multiple miners found");
            } else if (procs.length < 1) {
               resolve("No miners found");
            } else {
               let m = {
                  kill: function () {
                     exec("taskkill /PID " + procs[0]);
                  }
               }
               resolve(m);
            }
         }
      });
   });
}

const checkForOpenLoggers = () => {
   return new Promise((resolve, reject) => {
      exec(`wmic process WHERE 'CommandLine LIKE "%--charitas-role=charitas-log%" AND Name LIKE "%pwsh%"' GET ProcessId | more +1`, (err, stdout, stderr) => {
         if (err) {
            reject(err);
         } else if (stderr) {
            reject(stderr);
         } else {
            let procs = stdout.trim().split("\n").filter(p => p != "").map(p => p.trim());
            if (procs.length > 1) {
               reject("Multiple loggers found");
            } else if (procs.length < 1) {
               resolve("No loggers found");
            } else {
               let l = {
                  kill: function () {
                     exec("taskkill /PID " + procs[0]);
                  }
               }
               resolve(l);
            }
         }
      });
   });
}

const killAllOpen = () => {
   return new Promise((resolve, reject) => {
      exec(`wmic process where "commandline like '%--charitas-role=charitas-%' AND name like '%pwsh%'" call terminate`, (err, stdout, stderr) => {
         if (err) reject(err);
         else {
            miner = null;
            logger = null;
            resolve(miner, logger);
         }
      });
   });
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

const startMining = (onLaptop) => {
   return new Promise((resolve, reject) => {
      if (!onLaptop || (onLaptop && allowedToMine())) {
         let startMiners = new Promise((resolve, reject) => {
            let startup = spawn(path.join(__dirname, `../miner/Charitas.bat`));
            startup.stdout.on('data', data => resolve(data))
            startup.stderr.on('data', errdata => {
               if (data.toString().includes('pwsh')) {
                  document.getElementById('powershell-alert').style.display = 'block';
               }
               reject(errdata);
            });
         }).then((started) => {
            if (started.toString().includes("yea they opened")) {
               cooldown = true;
               setTimeout(() => {
                  cooldown = false
               }, COOLDOWN_TIME);
               resolve()
            } else {
               console.log(stdout.toString());
               reject(stdout.toString());
            }
         }).catch((error) => {
            console.error(error);
            reject(error);
         })
      } else {
         document.getElementById('laptop-alert').style.display = "block";
         document.getElementById('status-text').textContent = "";
         reject("not allowed to mine");
      }
   });
}

const stopMining = () => {
   return new Promise((resolve, reject) => {
      killAllOpen().then((closedMiner, closedLogger) => {
         if (!miner && !logger) {
            cooldown = true;
            setTimeout(() => {
               cooldown = false
            }, COOLDOWN_TIME);
            resolve();
         } else {
            reject("Not closed");
         }
      }).catch((err) => reject(err));
   })
}

const toggleUI = (status) => {
   if (status) {
      remote.getGlobal('tray').setImage(path.join(__dirname, '..', "favicon.ico"));
      [document.getElementById('mine-button').children[3], document.getElementById('mine-button').children[4]].forEach(c => c.setAttribute('class', 'on'));
   } else {
      remote.getGlobal('tray').setImage(path.join(__dirname, '..', "grayicon.ico"));
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
      [document.getElementById('mine-button').children[3], document.getElementById('mine-button').children[4]].forEach(c => c.setAttribute('class', 'off'));
   }
   setTimeout(() => {
      document.getElementById('status-text').textContent = ""
   }, Math.floor(Math.random() * (1050 - 750 + 1)) + 550);
}

const buttonClicked = (element) => {
   if (!cooldown) {
      if (miner) {
         document.getElementById('status-text').textContent = "Stopping Miner..."
         stopMining().then(() => {
            searchForOpen().then((openMiner, openLogger) => {
               if (!openMiner && !openLogger) {
                  toggleUI(false);
               }
            })
         }).catch((err) => {
            console.error(err);
         })
      } else {
         document.getElementById('status-text').textContent = "Starting Miner..."
         startMining(remote.getGlobal('isLaptop')).then(() => {
            searchForOpen().then((openMiner, openLogger) => {
               if (openMiner) {
                  toggleUI(true);
               }
            })
         })
      }
   }
}

exports.searchForOpen = searchForOpen;
exports.startMining = startMining;
exports.stopMining = stopMining;
exports.buttonClicked = buttonClicked;