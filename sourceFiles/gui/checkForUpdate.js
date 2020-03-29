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
            }
        })
    })
    req.on('error', (err) => {
        console.error(err);
    })
    req.end();