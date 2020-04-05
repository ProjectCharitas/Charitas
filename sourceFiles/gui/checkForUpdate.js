const https = require('https');
    const options = {
        hostname: 'charitas.co',
        port: 443,
        path: "/version.json",
        method: 'GET'
    }
    const req = https.request(options, (res) => {
        res.on('data', d => {
            const appVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'))).version;
            const webVersion = JSON.parse(d).version
            if(appVersion !== webVersion){
                document.getElementById('version-alert').style.display = 'block';
                document.getElementById('new-version-text').innerHTML = `You are using an outdated version of the Charitas client!<br>
                Your version is <span style = "font-weight: bold">${appVersion}</span>, while the latest version is <span style = "font-weight: bold">${webVersion}</span>.<br>
                Please download the latest version from <a href = "https://charitas.co/download" target="_blank">our website</a>. <br> <br>New in this update: <br>${JSON.parse(d).description}`;
            }
        })
    })
    req.on('error', (err) => {
        console.error(err);
    })
    req.end();