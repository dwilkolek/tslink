const express = require('express');

import * as path from 'path';
import { EpDbWorker } from './worker';
import { ConfigProvider } from './config-provider';
import { JobStatusEnum } from './job-status-enum';
import { FileProvider } from './file-provider';
import { JobDBO } from './types/job-dbo';

const cluster = require('cluster');
const os = require('os');
const fs = require('fs');
const unzip = require('unzip');
const fstream = require('fstream');

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
        this.createDirectories();
    }


    runningJobs = 0;
    forkCores() {
        let cpus = ConfigProvider.get().cpus || os.cpus().length;
        console.log(`Forking for ${cpus} CPUs`);
        for (let i = 0; i < cpus; i++) {
            cluster.fork();
        }
    }


    createDirectories() {
        FileProvider.createDirectory(FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory));
        FileProvider.createDirectory(FileProvider.getSystemPath(ConfigProvider.get().tempZipDirectory));
        FileProvider.createDirectory(FileProvider.getSystemPath(ConfigProvider.get().workspaceDirectory));
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
                        status: JobStatusEnum.STORED
                    }
                    this.db.storeJob(jobDBO, (job) => {
                        res.set('Content-Type', 'application/json');
                        res.json({ jobDBO: jobDBO });
                    })
                })
            })


        });

        this.app.get('*', (req: Request, res: Response) => {
            const url = path.resolve(path.join(__dirname, ConfigProvider.uiPath));
            if (this.allowedExt.filter(ext => req.url.indexOf(ext) > 0).length > 0) {
                (<any>res).sendFile(`${url}${req.url}`);
            } else {
                (<any>res).sendFile(`${url}\\index.html`);
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
        const pathZip = path.join(FileProvider.getSystemPath(ConfigProvider.get().tempZipDirectory), jobId + '.zip');

        fs.writeFileSync(pathZip, data);
        FileProvider.createDirectory(`${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobId}`);
        var readStream = fs.createReadStream(pathZip);
        var writeStream = fstream.Writer(`${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobId}`);
        readStream
            .pipe(unzip.Parse())
            .pipe(writeStream);
        fs.unlink(pathZip, (err) => {
            if (err) throw err;
            console.log(`successfully deleted ${pathZip}`);
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