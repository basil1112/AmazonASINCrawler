const express = require('express');
const cors = require('cors');
const fs = require('fs'); // Add the fs module
const app = express();
const port = 7000;
const { spawn } = require('child_process')
const path = require('path');

const allowedOrigins = ['http://example1.com', 'http://example2.com'];

app.use(cors({
    origin: allowedOrigins,
    optionsSuccessStatus: 200,
}));

app.use(express.json());


app.get("/getAuthKey", async (req, res) => {

    const childProcess = spawn('node', ['requestchecker.js']);

    childProcess.stdout.on('data', (data) => {
        console.log(`Child process output: ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
        console.error(`Child process error: ${data}`);
    });

    childProcess.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);

        const jsonFilePath = path.join(__dirname, '/apify_storage/datasets/firstdataset/', 'Auth.json');

        fs.readFile(jsonFilePath, 'utf8', (err, content) => {
            if (err) {
                reject(err)
                console.log("ERROR", err);
            } else {
                try {
                    res.json(content);
                } catch (err) {
                    console.log("ERROR", err);
                    res.json({ error: "AYOOO" + err })
                }
            }
        })

    });


})


app.post('/telegram_amazon', async (req, res) => {
    const { data } = req.body;
    console.log(data);

    try {

        const jsonFilePath = path.join(__dirname, '/apify_storage/datasets/firstdataset/', 'input.json');

        fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), () => {

            const childProcess = spawn('node', ['operationmanager.js']);

            childProcess.stdout.on('data', (data) => {
                console.log(`Child process output: ${data}`);
            });

            childProcess.stderr.on('data', (data) => {
                console.error(`Child process error: ${data}`);
            });

            childProcess.on('close', (code) => {
                console.log(`Child process exited with code ${code}`);
            });

            res.json({ "msg": "Processing" })

        });
        console.log('JSON data written to input.json');
    } catch (error) {
        console.error('Error writing JSON data:', error);
        return res.status(500).send('Error writing JSON data');
    }



});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
