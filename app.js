const express = require('express');
const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const cors = require("cors");

const app = express();
const docker = new Docker({socketPath: '/var/run/docker.sock'});


app.use(cors({origin: "http://localhost:5173"}));
app.use(express.json());

const BASE_HOST_DIR = path.join(__dirname, 'react-builds'); // Host directory to store React app builds
fs.ensureDirSync(BASE_HOST_DIR);


async function ensureImageExists(imageName) {
    try {
        // Check if the image exists locally
        const images = await docker.listImages({filters: {reference: [imageName]}});
        if (images.length > 0) {
            console.log(`Image ${imageName} already exists.`);
            return;
        }

        // Pull the image if it doesn't exist
        console.log(`Pulling image: ${imageName}`);
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err, stream) => {
                if (err) return reject(err);

                docker.modem.followProgress(stream, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                });
            });
        });
        console.log(`Image ${imageName} pulled successfully.`);
    } catch (error) {
        console.error(`Failed to ensure image exists: ${error.message}`);
        throw error;
    }
}

let clients = [];

function eventsHandler(request, response, next) {
    const appName = request.params.appName;
    const headers = {
        'Content-Type': 'text/event-stream', 'Connection': 'keep-alive', 'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);
    response.write(`data: "StartEvent"\n\n`);

    // const clientId = Math.random().toString(36).substring(7);

    const newClient = {
        id: appName, response
    };

    clients.push(newClient);

    request.on('close', () => {
        console.log(`${appName} Connection closed`);
        clients = clients.filter(client => client.id !== appName);
    });
}

app.get('/events/:appName', eventsHandler);

function sendEventsToAll(newFact) {
    clients.forEach(client => client.response.write(`data: ${JSON.stringify(newFact)}\n\n`))
}

function sendEventsToOne(appName, message) {
    const client = clients.find(client => client.id === appName);
    client.response.write(`data: ${JSON.stringify(message)}\n\n`);
}

app.post('/create-react-app', async (req, res) => {
    const {appName} = req.body;
    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    if (!appName) {
        return res.status(400).json({error: 'appName is required'});
    }

    const appDir = path.join(BASE_HOST_DIR, appName);

    if (fs.existsSync(appDir)) {
        return res.status(400).json({error: `React app ${appName} already exists`});
    }
    try {
        const imageName = 'node:18-alpine';

        // Step 1: Ensure the Docker image exists
        sendEventsToOne(appName, `Ensuring Docker image ${imageName} is available...`);
        await ensureImageExists(imageName);
        sendEventsToOne(appName, `Docker image ${imageName} is ready.`);

        // Step 2: Start building the React app
        sendEventsToOne(appName, `Creating React app: ${appName}...`);
        fs.ensureDirSync(appDir);

        const commands = [`npm i -g create-react-app`, `npx create-react-app ${appName}`, `cd ${appName} && npm run build`, `cp -r build /output`,].join(' && ');

        const container = await docker.createContainer({
            Image: imageName, Tty: true, Cmd: ['sh', '-c', commands], HostConfig: {
                Binds: [`${appDir}:/output`],
            },
        });
        res.status(200).json({
            message: 'React app creating', data: container?.data || {}
        });
        await container.start();

        // Stream logs from the container
        sendEventsToOne(appName, `Building the React app. Logs:`);
        const logsStream = await container.logs({
            follow: true, stdout: true, stderr: true,
        });

        logsStream.on('data', (chunk) => {
            sendEventsToOne(appName, chunk.toString());
        });

        const interval = setInterval(() => {
            sendEventsToOne(appName, `Building....`);
        }, 5000)
        await container.wait();
        await container.remove();

        clearInterval(interval)
        // Step 4: Completion message


        sendEventsToOne(appName, `React app ${appName} created and built successfully.`);
        sendEventsToOne(appName, `CloseEvent`);
        console.log("App build successfully.");
    } catch (error) {
        console.error('Error creating React app:', error.message);
        res.status(500).json({error: error.message});
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
