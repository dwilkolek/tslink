const express = require('express');
import * as path from 'path';
import { EpDbWorker } from './worker';
import { ConfigProvider } from './config-provider';

const cluster = require('cluster');
const os = require('os');
const fs = require('fs');


export class MasterWorker extends EpDbWorker {
    public app: any;
    private port = ConfigProvider.get().port || 9090;

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
        super();
        console.log("Master pid:", process.pid)
        this.forkCores();
        this.initExpress();
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

        const job:string = fs.readFileSync(`${ConfigProvider.get().jobsDir}/example-1.js`).toString();

        

        // Route our backend calls
        // this.app.get('/api/storedJobs', (req: any, res: any) => {
        //     console.log('files,', this.files)
        //     res.json(this.files);
        // });

        this.app.get('/api/runAllStoredJobs', (req: any, res: any) => {
            // console.log('files,', this.files);

            // this.getRandomSlave().send({
            //     cmd: 'runJob',
            //     file: `${ConfigProvider.get().jobsDir}/example-1.js`
            // });
            // this.getRandomSlave().send({
            //     cmd: 'runJob',
            //     file: `${ConfigProvider.get().jobsDir}/example-2.js`
            // });
            // this.runningJobs++;
            const jobToInser = <any>{
                name: 'dupa1',
                job: job
            };
            this.db.then(db => {
                db.collection('jobs').insertOne(jobToInser, (err:any,res:any) => {
                    // console.log(res, err);
                    this.getRandomSlave().send({
                        cmd: 'runJob',
                        id: jobToInser['_id']
                    });                    
                });
            })

            res.json({done:true})
            
        });
      
        this.app.get('*', (req: Request, res: Response) => {
            if (this.allowedExt.filter(ext => req.url.indexOf(ext) > 0).length > 0) {
                (<any>res).sendFile(path.resolve(`${this.UI_PATH}${req.url}`));
            } else {
                (<any>res).sendFile(path.resolve(`${this.UI_PATH}index.html`));
            }
        });

        this.app.listen(this.port, () => console.log(`http is started ${this.port}`));

        this.app.on('error', (error: any) => {
            console.error('ERROR', error);
        });

        process.on('uncaughtException', (error: any) => {
            console.log(error);
        });

    }

    getRandomSlave() {
        const workerNames = Object.keys(cluster.workers);
        const workableWorkers = workerNames.map(name => {
            return cluster.workers[name];
        }).filter(worker => worker.process.pid != process.pid);
        console.log('workers left:', workableWorkers.length)
        return workableWorkers[Math.round(Math.random() * 1000) % workableWorkers.length];
    }
}