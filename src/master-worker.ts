const express = require('express');

import * as path from 'path';
import { EpDbWorker } from './worker';
import { ConfigProvider } from './config-provider';
import { JobDefinitionDBO } from './db/job-definition-dbo';
import { JobDBO } from './db/job-dbo';
import { JobStatusEnum } from './job-status-enum';
import { FileProvider } from './file-provider';
import { JobConfigDBO } from './db/job-config-dbo';

const cluster = require('cluster');
const os = require('os');
const fs = require('fs');
const unzip = require('unzip');

const fileUpload = require('express-fileupload');
export class MasterWorker extends EpDbWorker {
    public app: any;
    private port = ConfigProvider.get().port || 9090;

    private files: string[] = [];

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
        console.log('> Welcome to epjs >')
        console.log("Master pid:", process.pid)

        if (ConfigProvider.isDev) {
            console.warn('RUNNING IN DEVELOPMENT MODE.')
        }

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

        if (ConfigProvider.isDev) {
            this.app.use(function (req: any, res: any, next: any) {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                next();
            });
        }

        this.app.post('/api/job', (req: any, res: any) => {
            const jobDefinition = {
                name: req.param('name')
            };
            this.db.storeJobDefinition(jobDefinition, jobDefinition => {
                res.set('Content-Type', 'application/json');
                this.storeToDisk(req.files.job.data, jobDefinition._id || '');

                res.json({ id: jobDefinition._id });
            });

        });

        this.app.post('/api/config', (req: any, res: any) => {
            this.db.storeJobConfig(JSON.parse(req.files.config.data.toString()), jobConfig => {
                res.set('Content-Type', 'application/json');
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
                        res.set('Content-Type', 'application/json');
                        res.json({ jobDBO: jobDBO });
                    })
                })
            })


        });

        this.app.get('*', (req: Request, res: Response) => {
            if (this.allowedExt.filter(ext => req.url.indexOf(ext) > 0).length > 0) {
                (<any>res).sendFile(path.resolve(`${ConfigProvider.uiPath}${req.url}`));
            } else {
                (<any>res).sendFile(path.resolve(`${ConfigProvider.uiPath}index.html`));
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

    storeToDisk(data: any, jobId: string) {
        const pathZip = path.join(FileProvider.getSystemPath('zips'), jobId + '.zip');
        fs.writeFileSync(pathZip, data);
        fs.createReadStream(pathZip).pipe(
            unzip.Extract(
                { path: `${FileProvider.getSystemPath(ConfigProvider.get().tempJobDir)}/${jobId}` }
            )
        );
        // const dir = `${ConfigProvider.get().tempJobDir}/${jobDefinitionDBO._id}`
        // const newDir = FileProvider.getSystemPath(dir);
        // console.log(dir, newDir)
        // const jobFilename = path.join(newDir, 'job.js');
        // const configFilename = path.join(newDir, 'config.json');
        // fs.mkdirSync(newDir, 0o744);
        // console.log('Created job directory', newDir)
        // fs.createReadStream('path/to/archive.zip').pipe(unzip.Extract({ path: 'output/path' }))
        // // fs.writeFileSync(configFilename, JSON.stringify(config));
        // return jobFilename;
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