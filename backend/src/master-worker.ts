const express = require('express');
import * as path from 'path';
import { EpWorker } from './worker';

const cluster = require('cluster');
const os = require('os');


export class MasterWorker implements EpWorker {
    public app: any;
    private port = 9090;

    private files: string[] = [];
    private UI_PATH = '../../frontend/dist/frontend/';
    private allowedExt = [
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
        console.log("Master pid:", process.pid)
        this.forkCores();
        this.initExpress();
    }

    getRandomSlave() {
        const workerNames = Object.keys(cluster.workers);
        const workableWorkers = workerNames.map(name => {
            return cluster.workers[name];
        }).filter(worker => worker.process.pid != process.pid);
        console.log('workers left:', workableWorkers.length)
        return workableWorkers[Math.round(Math.random() * 1000) % workableWorkers.length];
    }
    runningJobs = 0;
    forkCores() {
        let cpus = os.cpus().length;
        const args = <string[]>process.argv;
        args.forEach(arg => {
            if (arg.indexOf('cpu=') > -1) {
                const configCpus = parseInt(arg.replace('cpu=', ''));
                //TODO: maybe enable forking to more than have?
                if (configCpus <= cpus) {
                    cpus = configCpus
                } else {
                    console.warn(`Set more cpus that possibles. Fallback to: ${cpus}cpus`);
                }
            }
        })
        console.log(`Forking for ${cpus} CPUs`);
        for (let i = 0; i < cpus; i++) {
            cluster.fork();
        }
    }
    initExpress() {
        this.app = express();

        // Route our backend calls
        this.app.get('/api/storedJobs', (req: any, res: any) => {
            console.log('files,', this.files)
            res.json(this.files);
        });

        this.app.get('/api/runAllStoredJobs', (req: any, res: any) => {
            // console.log('files,', this.files);

            this.getRandomSlave().send({
                cmd: 'runJob',
                file: './jobs/job-1.js'
            });
            this.runningJobs++;
            res.json({ runningJobs: this.runningJobs });
        });
        // this.app.get('/api/stats', (req: any, res: any) => {
        //     res.json(
        //         App.getInstance().jobs.map(job => {
        //             return job.counterStore.json();
        //         })
        //     );
        // });


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