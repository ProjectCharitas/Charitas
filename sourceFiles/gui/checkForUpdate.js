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
                console.log("not equal");
                
                document.body.innerHTML += `
                <style>
                    .alert-modal{
                        position: fixed; 
                        z-index: 100; 
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        overflow: auto;
                        background-color: rgb(0,0,0);
                        background-color: rgba(0,0,0,0.4); 
                    }
                    .alert-modal-content{
                        background-color: #fefefe;
                        margin: 15% auto;
                        padding: 20px;
                        border: 1px solid #888;
                        width: 80%;
                        border-radius: 25px;
                    }
                    .alert-modal-content * {
                        color: black !important;
                        font-size: 1.4rem;
                        text-decoration-color: #19AAEE;
                    }

                    .close {
                        color: #aaa;
                        float: right;
                        font-size: 28px;
                        font-weight: bold;
                    }
                    .close:hover, .close:focus{
                        color: black;
                        text-decoration: none;
                        cursor: pointer;
                    }
                </style>
                <div class = "alert-modal" id = "version-alert">
                    <div class = "alert-modal-content">
                        <span class = "close" onclick = "document.getElementById('version-alert').style.display = 'none';" >&times;</span>
                        <p>You are using an outdated version of the Charitas client!<br>
                        Your version is <span style = "font-weight: bold">${appVersion}</span>, while the latest version is <span style = "font-weight: bold">${webVersion}</span>. New in this update: <br>${JSON.parse(d).description}<br><br>
                        Please <a href = "${JSON.parse(d).link}" alt = "New version of Charitas">download the latest version</a> from <a href = "https://charitas.co" target="_blank">our website</a>.</p>
                    </div>
                <div>
                `
            }
        })
    })
    req.on('error', (err) => {
        console.error(err);
    })
    req.end();