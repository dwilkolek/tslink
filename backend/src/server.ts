const express = require('express');
import * as path from 'path';
import { Job } from './job';
import { App } from './app';
import { worker } from 'cluster';

const cluster = require('cluster');
const os = require('os');


class Server {
    public app: any;
    private port = 9090;

    public static bootstrap(): Server {
        if (cluster.isMaster) {
            const cpus = os.cpus().length - 2;

            console.log(`Forking for ${cpus} CPUs`);
            for (let i = 0; i < cpus; i++) {
                cluster.fork();
            }
        } else {

        }

        return new Server();
    }

    files: string[] = [];
    UI_PATH = '../../frontend/dist/frontend/';
    allowedExt = [
        '.js',
        '.ico',
        '.css',
        '.png',
        '.jpg',
        '.woff2',
        '.woff',
        '.ttf',
        '.svg',
    ];
    constructor() {
        if (cluster.isMaster) {
            console.log("Master pid:", process.pid)
            this.initExpress();
        }
    }

    initExpress() {
        this.app = express();
        App.getInstance().scanDirectory().then(files => {
            this.files = files;
        });
        // Route our backend calls
        this.app.get('/api/storedJobs', (req: any, res: any) => {
            console.log('files,', this.files)
            res.json(this.files);
        });
        this.app.get('/api/runAllStoredJobs', (req: any, res: any) => {
            // console.log('files,', this.files);

            const msgs: any[] = [];
            App.getInstance().scanDirectory().then(files => {
                files.forEach(file => {
                    // App.getInstance().runJob(file);
                    const workerNames = Object.keys(cluster.workers);
                    const workableWorkers = workerNames.map(name => {
                        return cluster.workers[name];
                    }).filter(worker => worker.process.pid != process.pid);
                    console.log('workers left:', workableWorkers.length)
                    const worker = workableWorkers[Math.round(Math.random()*1000)%workableWorkers.length];
                    const msg = {
                        cmd: 'runJob',
                        file: file
                    };
                    msgs.push(msg);
                    worker.send(msg);
                })
            });

            res.json(msgs);
        });
        this.app.get('/api/stats', (req: any, res: any) => {
            res.json(
                App.getInstance().jobs.map(job => {
                    return job.counterStore.json();
                })
            );
        });


        // Redirect all the other resquests
        this.app.get('*', (req: Request, res: Response) => {
            if (this.allowedExt.filter(ext => req.url.indexOf(ext) > 0).length > 0) {
                (<any>res).sendFile(path.resolve(`${this.UI_PATH}${req.url}`));
            } else {
                (<any>res).sendFile(path.resolve(`${this.UI_PATH}index.html`));
            }
        });

        // Depending on your own needs, this can be extended
        // this.app.use(bodyParser.json({ limit: '50mb' }));
        // this.app.use(bodyParser.raw({ limit: '50mb' }));
        // this.app.use(bodyParser.text({ limit: '50mb' }));
        // this.app.use(bodyParser.urlencoded({
        //   limit: '50mb',
        //   extended: true
        // }));

        // Start the server on the provided port
        this.app.listen(this.port, () => console.log(`http is started ${this.port}`));

        // Catch errors
        this.app.on('error', (error: any) => {
            console.error('ERROR', error);
        });

        process.on('uncaughtException', (error: any) => {
            console.log(error);
        });
    }
}

process.on('message', msg => {
    console.log('message', msg)
    if (msg.cmd = 'runJob' && !!msg.file) {
        console.log('processing')
        App.getInstance().runJob(msg.file);
    }
});

//Bootstrap the server, so it is actualy started
const server = Server.bootstrap();
export default server.app;