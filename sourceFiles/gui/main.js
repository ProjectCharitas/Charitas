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

let win = null;

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
        "startup": false
      }
      if (isLaptop) defaultOpts["laptop"] = true;
      fs.writeFileSync(`${process.env.APPDATA}\\charitas\\options.json`, JSON.stringify(defaultOpts), {
        flag: "w"
      })
    }
    const sysTray = new Tray(path.join(__dirname, "..", "favicon.ico"));
    sysTray.setContextMenu(Menu.buildFromTemplate([{
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
        label: "Settings",
        submenu: [
          {
            label: "Dark Mode",
          },
          {
            label: "CPU"
          }, 
          {
            label: "GPU"
          }
      ]
      }
    ]));
    sysTray.on('click', function () {
      sysTray.popUpContextMenu();
    });
    global.tray = sysTray;
    win.loadFile(path.join(__dirname, 'index.html'));
  });
  win.on('close', (event) => {
    event.preventDefault();
    win.hide();
  });
}

const gotTheLock = app.requestSingleInstanceLock()
console.log(gotTheLock);

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
  }
  else {
    win.show();
  }
});