const {
    exec
} = require("child_process");

const goback = () => {
    const checkForShortcut = new Promise((resolve, reject) => {
        exec(`dir /b "%userprofile%\\Start Menu\\Programs\\Startup"`, (err, stdout, stderr) => {
            if (err) reject(err);
            if (stderr) reject(stderr);
            const startupApps = stdout.trim().split("\n");
            shortcutExists = startupApps.filter(e => e.startsWith("charitasStartup")).length > 0;
            resolve(shortcutExists);
        });
    }).then( (shortcutExists) => {
        if(opts['startup']){
            if(!shortcutExists){
                exec(`cd "${path.join(__dirname, "../miner")}" && call copyStartup.bat`, (err, stdout, stderr) => {
                    if (err) console.error(err);
                    if (stderr) console.error(stderr);
                });
            }
        }
        else {
            if(shortcutExists){
                exec(`cd "${path.join(__dirname, "../miner")}" && call deleteStartup.bat`, (err, stdout, stderr) => {
                    if (err) console.error(err);
                    if (stderr) console.error(stderr);
                });
            }
        }
        fs.writeFile(`${process.env.APPDATA}\\charitas\\options.json`, JSON.stringify(opts), (err) => {
            if (err) console.error(err);
        });
    }).catch( err => {
        console.error(err);
    });
}

const toggle = (e) => {
    if (e.id == "cpu") {
        if (!e.checked) {
            if (!document.getElementById("gpu").checked) {
                document.getElementById("gpu").checked = true;
                opts['gpu'] = document.getElementById("gpu").checked;
            }

        }
    }
    if (e.id == "gpu") {
        if (!e.checked) {
            if (!document.getElementById("cpu").checked) {
                document.getElementById("cpu").checked = true;
                opts['cpu'] = document.getElementById("cpu").checked;
            }
        }
    }
    if(e.type == "checkbox") {
        opts[e.id] = e.checked;
    }
    else if(e.id = "affinity"){
        opts[e.id] = Math.pow(e.value, 2) - 1;
    }
}