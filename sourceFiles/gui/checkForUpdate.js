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
                Your version is <span style = "font-weight: bold">${appVersion}</span>, while the latest version is <span style = "font-weight: bold">${webVersion}</span>. New in this update: <br>${JSON.parse(d).description}<br><br>
                Please <a href = "${JSON.parse(d).link}" alt = "New version of Charitas">download the latest version</a> from <a href = "https://charitas.co" target="_blank">our website</a>.`;
            }
        })
    })
    req.on('error', (err) => {
        console.error(err);
    })
    req.end();