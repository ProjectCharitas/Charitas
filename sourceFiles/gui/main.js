const {
  app,
  BrowserWindow,
  Tray,
  Menu
} = require('electron');
const path = require('path');
const fs = require('fs');
const {
  exec
} = require('child_process');
const os = require('os');
const miner = require('./miner.js')

win = null;

const createWindow = () => {
  win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.once('ready-to-show', () => {
    win.show()
  })
  let checkForLaptop = new Promise((resolve, reject) => {
    exec(`wmic path win32_battery get BatteryStatus`, (err, stdout, stderr) => {
      if (stderr.length) global.isLaptop = false;
      else if (stdout.length) {
        global.isLaptop = true;
      }
      resolve(global.isLaptop);
    })
  }).then(isLaptop => {
    if (!fs.existsSync(path.join(app.getPath('userData'), "options.json"))) {
      if (!fs.existsSync(app.getPath('userData'))) fs.mkdirSync(app.getPath('userData'));
      let defaultOpts = {
        "cpu": true,
        "gpu": true,
        "dark": false,
        "startup": false,
        "affinity": Math.pow(2, Math.ceil(os.cpus().length * 0.75)) - 1
      }
      if (isLaptop) defaultOpts["laptop"] = true;
      fs.writeFileSync(`${process.env.APPDATA}\\charitas\\options.json`, JSON.stringify(defaultOpts), {
        flag: "w"
      })
    }
    const sysTray = new Tray(path.join(__dirname, "..", "favicon.ico"));
    const sysMenuStart = Menu.buildFromTemplate([{
        label: "Force Quit",
        click: function () {
          win.destroy();
        }
      },
      {
        label: "Open Charitas",
        click: function () {
          win.show();
        }
      },
      {
        type: "separator"
      },
      {
        label: "Start Mining",
        id: "mining",
        click: function () {
          console.log(global.isLaptop);
          miner.startMining(global.isLaptop).catch((err) => {
            console.log(err);
            if(err.includes("not allowed to mine")){
              sysTray.displayBalloon({
                iconType: 'warning',
                title: 'Laptop Mode',
                content: 'Your settings prevent Charitas from launching without a sufficient power source. Please plug in your device or disable Laptop Mode in the settings.'
              })
            }
          })
          win.reload();
          sysTray.setContextMenu(sysMenuStop);
        }
      }
    ]);
    const sysMenuStop = Menu.buildFromTemplate([{
        label: "Force Quit",
        click: function () {
          win.destroy();
        }
      },
      {
        label: "Open Charitas",
        click: function () {
          win.show();
        }
      },
      {
        type: "separator"
      },
      {
        label: "Stop Mining",
        id: "mining",
        click: function () {
          miner.stopMining();
          win.reload();
          sysTray.setContextMenu(sysMenuStart);
        }
      }
    ]);
    sysTray.setContextMenu(sysMenuStart);
    sysTray.on('click', function () {
      sysTray.popUpContextMenu();
    });
    global.tray = sysTray;
    global.menuStart = sysMenuStart;
    global.menuStop = sysMenuStop;
    win.loadFile(path.join(__dirname, 'index.html'));
  });
  win.on('close', (event) => {
    event.preventDefault();
    win.hide();
  });
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  })

  // Create myWindow, load the rest of the app, etc...
  app.once('ready', createWindow);
}



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  };
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  } else {
    win.show();
  }
});