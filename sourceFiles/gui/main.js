const {
  app,
  BrowserWindow
} = require('electron');
const path = require('path');
const {
  exec
} = require('child_process');
const fs = require('fs');

const createWindow = () => {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: true
    }
  })
  if (!fs.existsSync(path.join(app.getPath('userData'), "options.json"))) {
    if(!fs.existsSync(app.getPath('userData'))) fs.mkdirSync(app.getPath('userData'));
    fs.writeFileSync(`${process.env.APPDATA}\\charitas\\options.json`, JSON.stringify({
      "cpu": true,
      "gpu": true,
      "dark": false,
      "startup": false
    }), {
      flag: "w"
    })
  }
  win.loadFile(path.join(__dirname, 'index.html'));
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