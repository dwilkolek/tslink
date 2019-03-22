const express = require('express');
import * as path from 'path';
import { EpDbWorker } from './worker';
import { ConfigProvider } from './config-provider';
import { JobDefinitionDBO } from './db/job-definition-dbo';
import { JobDBO } from './db/job-dbo';
import { JobStatusEnum } from './job-status-enum';

const cluster = require('cluster');
const os = require('os');
const fs = require('fs');
const fileUpload = require('express-fileupload');
export class MasterWorker extends EpDbWorker {
    public app: any;
    private port = ConfigProvider.get().port || 9090;

    private files: string[] = [];
    private UI_PATH = 'ui/';
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
        let cpus = ConfigProvider.get().cpus || os.cpus().length;
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

        this.app.use(fileUpload());
        this.app.post('/api/job', (req: any, res: any) => {
            const jobDefinition = {
                name: req.param('name'),
                jobString: req.files.job.data.toString()
            };
            this.db.storeJobDefinition(jobDefinition, jobDefinition => {
                res.json({ id: jobDefinition._id });
            });

        });

        this.app.post('/api/config', (req: any, res: any) => {
            this.db.storeJobConfig(JSON.parse(req.files.config.data.toString()), jobConfig => {
                res.json({ id: jobConfig._id });
            });
        });

        this.app.post('/api/job/start', (req: any, res: any) => {
            const jobId = req.param('jobId');
            const configId = req.param('configId');
            console.log('starting', jobId, configId)
            this.db.findJobDefinition(jobId).then(jobDefinition => {
                this.db.findJobConfig(configId).then(jobConfig => {
                    const jobDBO: JobDBO = {
                        jobDefinitionId: jobId,
                        config: jobConfig,
                        status: JobStatusEnum.READY
                    }
                    this.db.storeJob(jobDBO, (job) => {
                        res.json({ jobDBO: jobDBO });
                    })
                })
            })

            
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