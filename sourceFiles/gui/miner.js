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
                killDuplicates();
            }
        }
    });
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
                killDuplicates();
            }
        }
    });
}

const killDuplicates = () => {
    exec(`wmic process where "commandline like '%--charitas-role=charitas-%' AND name like '%pwsh%'" get processid | more +1`, (err, stdout, sdterr) => {
        if (err) console.error(err);
        stdout.trim().split("\n").filter(p => p != "").map(p => p.trim()).forEach(e => exec(`taskkill /f /pid ${e}`, (er, sout, serr) => {
            if (er)
                console.error(er);
            if (serr)
                console.error(serr);
        }));
    });
}

const toggleSpinner = () => {
    [document.getElementById('mine-button').children[3], document.getElementById('mine-button').children[4]].forEach(c => c.setAttribute('class', state ? 'on' : 'off'));
}

const clicked = (e) => {
    state = !state;
    if (state) { //miner turned on
        if (remote.getGlobal('isLaptop')) {
            startMining(true);
        } else {
            startMining(false);
        }
    } else { //miner turned off
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
    }
}

const allowedToMine = () => {
    let opts = require(`${process.env.APPDATA}\\charitas\\options.json`);
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
        let startup = spawn(path.join(__dirname, `../miner/CharitasCGPU.bat`));
        startup.stdout.on('data', data => console.log(`stdout: ${data}`))
        startup.stderr.on('data', data => {
            console.error(`stderr: ${data}`);
            if (data.toString().includes('pwsh')) {
                document.body.innerHTML += `
                <style>.alert-modal{position:fixed;z-index:100;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgb(0,0,0);background-color:rgba(0,0,0,.4)}.alert-modal-content{background-color:#fefefe;margin:15% auto;padding:20px;border:1px solid #888;width:80%;border-radius:25px}.alert-modal-content *{color:black!important;font-size:1.7rem;text-decoration-color:#19AAEE}.close{color:#aaa;float:right;font-size:28px;font-weight:700}.close:hover,.close:focus{color:darkred;text-decoration:none;cursor:pointer}</style>
                <div class = "alert-modal" id = "powershell-alert">
                    <div class = "alert-modal-content">
                        <span class = "close" onclick = "document.getElementById('powershell-alert').style.display = 'none';" >&times;</span>
                        <p>Error! PowerShell version 6.2+ was not installed properly or cannot be found. Please either reinstall Charitas from our website, or download the latest version of PowerShell Core free from <a href="https://github.com/PowerShell/PowerShell/releases/">Microsoft</a></p>
                    </div>
                <div>
                `
            }
        });
        searchForOpenMiners();
    } else {
        document.body.innerHTML += `
                <style>.alert-modal{position:fixed;z-index:100;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgb(0,0,0);background-color:rgba(0,0,0,.4)}.alert-modal-content{background-color:#fefefe;margin:15% auto;padding:20px;border:1px solid #888;width:80%;border-radius:25px}.alert-modal-content *{color:black!important;font-size:1.7rem;text-decoration-color:#19AAEE}.close{color:#aaa;float:right;font-size:28px;font-weight:700}.close:hover,.close:focus{color:darkred;text-decoration:none;cursor:pointer}</style>
                <div class = "alert-modal" id = "laptop-alert">
                    <div class = "alert-modal-content">
                        <span class = "close" onclick = "document.getElementById('laptop-alert').style.display = 'none';" >&times;</span>
                        <p>Laptop mode prevented Charitas from launching. Please ensure your laptop is plugged in and recieving power, or disable laptop mode in settings to prevent this message from appearing.</p>
                    </div>
                <div>
                `
    }
}

const stopMining = () => {
    miner.kill();
    logger.kill();
}