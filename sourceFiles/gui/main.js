const {
  app,
  BrowserWindow
} = require('electron');
const path = require('path');
const fs = require('fs');
const {
  exec
} = require('child_process');

const createWindow = () => {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: true
    }
  });
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
    win.loadFile(path.join(__dirname, 'index.html'));
  })
  win.on('closed', () => {
    win = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  };
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});