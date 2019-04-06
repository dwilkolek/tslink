import * as cluster from 'cluster';
import * as express from 'express';
import * as expressFileupload from 'express-fileupload';
import * as fs from 'fs';
import * as fstream from 'fstream';
import { Cursor } from 'mongodb';
import * as os from 'os';
import * as path from 'path';
import { Transform } from 'stream';
import * as unzip from 'unzip';
import { isArray } from 'util';
import { ConfigProvider } from './config-provider';
import { DbWorker } from './db-wroker';
import { FileProvider } from './file-provider';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { IJobDBO } from './types/job-dbo';
import { TSlinkWorker } from './worker';

export class MasterWorker extends TSlinkWorker {
    public app: express.Application;

    public runningJobs = 0;
    public timeoutAbandonedJobs?: NodeJS.Timeout;
    public timeoutToUpdateOffsetsInDb?: NodeJS.Timeout;
    private port = ConfigProvider.get().port || 9090;
    private maxSlaveWorkers = 1;
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
        console.log('> Welcome to TSlink >');
        console.log('Master pid:', process.pid);

        if (ConfigProvider.isDev) {
            console.warn('RUNNING IN DEVELOPMENT MODE.');
        }

        this.forkCores();
        this.app = this.initExpress();
        this.createDirectories();
    }
    public forkCores() {
        cluster.fork({ type: 'dbworker' });
        this.maxSlaveWorkers = ConfigProvider.get().slaveWorkerCount || os.cpus().length;
        setInterval(() => {
            const workerCount = Object.keys(cluster.workers).length - 1;
            console.log('SlaveWorker count', workerCount);
            if (this.maxSlaveWorkers > workerCount) {
                this.db.jobsToRunCount().then((numberOfStoredJobs) => {
                    const workersLeft = this.maxSlaveWorkers - workerCount;
                    const lower = workersLeft < numberOfStoredJobs ? workersLeft : numberOfStoredJobs;
                    for (let i = 0; i < lower; i++) {
                        cluster.fork({ type: 'slaveworker' });
                    }
                });
            }
        }, 10000);

        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received.');
            Object.keys(cluster.workers).forEach((key) => {
                const maybeWorker = cluster.workers[key];
                if (maybeWorker != null) {
                    const worker = maybeWorker as cluster.Worker;
                    worker.send({ type: 'killAll' });
                }
            });
        });
    }

    public createDirectories() {
        FileProvider.createDirectory(FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory));
        FileProvider.createDirectory(FileProvider.getSystemPath(ConfigProvider.get().tempZipDirectory));
        FileProvider.createDirectory(FileProvider.getSystemPath(ConfigProvider.get().workspaceDirectory));
    }

    public initExpress() {
        const app = express.default();
        app.use(expressFileupload.default());

        if (ConfigProvider.isDev) {
            app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                res.header('Access-Control-Allow-Methods', '*');
                next();
            });
        }

        app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (req.url.indexOf('/api') === 0) {
                res.set('Content-Type', 'application/json');
            }
            next();
        });

        app.get('/api/job', (req: express.Request, res: express.Response) => {
            this.db.findJobs().then((cursor) => {
                this.collect(cursor, (data) => {
                    res.json(data);
                });
            });
        });

        app.put('/api/job/:jobId', (req: express.Request, res: express.Response) => {
            // tslint:disable-next-line:no-unsafe-any
            const jobId = req.params.jobId as string;
            this.db.findJob(jobId).then((originalJob) => {
                if (originalJob) {
                    const jobCopy = DbWorker.copyJob(originalJob);
                    this.db.storeJob(jobCopy).then(() => {
                        res.json();
                    });
                }
            });
        });

        app.delete('/api/job/:jobId', (req: express.Request, res: express.Response) => {
            // tslint:disable-next-line:no-unsafe-any
            const jobId = req.params.jobId as string;
            if (jobId) {
                console.log('let\'s kill ' + jobId);
                if (cluster.workers) {
                    Object.keys(cluster.workers).forEach((key) => {
                        const worker = cluster.workers[key];
                        if (worker) {
                            worker.send({ type: 'kill', jobid: jobId });
                        }
                    });
                    res.json();
                }
            }
        });

        app.get('/api/job/:jobId', (req: express.Request, res: express.Response) => {
            // tslint:disable-next-line:no-unsafe-any
            const jobId = req.params.jobId as string;

            this.db.findJob(jobId).then((data) => {
                res.json(data);
            });
        });

        app.get('/api/job-definition', (req: express.Request, res: express.Response) => {
            this.db.findJobDefinitions().then((cursor) => {
                this.collect(cursor, (data) => {
                    res.json(data);
                });
            });
        });

        app.get('/api/job-config', (req: express.Request, res: express.Response) => {
            this.db.findJobConfigs().then((cursor) => {
                this.collect(cursor, (data) => {
                    res.json(data);
                });
            });
        });

        app.post('/api/job-definition', (req: express.Request, res: express.Response) => {
            const jobDefinition = {
                // tslint:disable-next-line:no-unsafe-any
                name: req.body.name,
            };
            if (req.files != null && req.files.job != null) {
                const uploadedFile: expressFileupload.UploadedFile = isArray(req.files.job) ? req.files.job[0] : req.files.job;
                this.db.storeJobDefinition(jobDefinition).then((storeResult) => {
                    this.storeToDisk(uploadedFile.data, storeResult.insertedId.toHexString() || '');
                    res.json({ id: storeResult.insertedId.toHexString() });
                });
            } else {
                res.json({ id: null });
            }

        });

        app.post('/api/job-config', (req: express.Request, res: express.Response) => {
            if (req.files != null && req.files.config) {
                const uploadedFile: expressFileupload.UploadedFile = isArray(req.files.config) ? req.files.config[0] : req.files.config;
                this.db.storeJobConfig(JSON.parse(uploadedFile.data.toString()) as IJobConfig).then((storeResult) => {
                    res.json({ id: storeResult.insertedId.toHexString() });
                });
            } else {
                res.json({ id: null });
            }
        });

        app.post('/api/job/start', (req: express.Request, res: express.Response) => {
            /* tslint:disable:no-unsafe-any */
            if (req.query.jobId != null && req.query.configId != null && req.query.name != null) {
                const jobId = req.query.jobId;
                const configId = req.query.configId;
                const name = req.query.name;
                this.db.findJobDefinition(jobId).then((jobDefinition) => {
                    this.db.findJobConfig(configId).then((jobConfig) => {
                        if (jobConfig != null) {
                            const jobDBO: IJobDBO = {
                                config: jobConfig,
                                jobDefinitionId: jobId,
                                name,
                                progress: -1,
                                status: JobStatusEnum.STORED,
                            };
                            /* tslint:enable:no-unsafe-any */
                            this.db.storeJob(jobDBO).then((result) => {
                                res.json({ id: result.insertedId });
                            });
                        } else {
                            res.json({ error: 'no-config' });
                        }
                    });
                });
            } else {
                res.json({});
            }
        });

        app.get('*', (req: express.Request, res: express.Response) => {
            const url = path.resolve(path.join(__dirname, ConfigProvider.uiPath));
            if (this.allowedExt.filter((ext) => req.url.indexOf(ext) > 0).length > 0) {
                res.sendFile(path.join(url, req.url));
            } else {
                res.sendFile(path.join(url, 'index.html'));
            }
        });

        app.listen(this.port, () => console.log(`http is started ${this.port}`));

        app.on('error', (error) => {
            console.error('ERROR', error);
        });

        process.on('uncaughtException', (error) => {
            console.log(error);
        });

        return app;
    }

    public collect<T>(cursor: Cursor<T>, done: (data: T[]) => void) {
        const list: T[] = [];
        cursor.forEach((element: T) => {
            list.push(element);
        }, () => {
            done(list);
        });
    }

    private storeToDisk(data: Buffer, jobId: string) {
        const pathZip = path.join(FileProvider.getSystemPath(ConfigProvider.get().tempZipDirectory), jobId + '.zip');
        fs.writeFileSync(pathZip, data);
        FileProvider.createDirectory(`${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobId}`);
        const readStream = fs.createReadStream(pathZip);
        // tslint:disable-next-line:no-unsafe-any
        const writeStream = fstream.Writer(`${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobId}`);
        readStream
            .pipe(unzip.Parse() as Transform)
            .pipe(writeStream);
        fs.unlink(pathZip, (err) => {
            if (err) {
                throw err;
            }
        });
    }

}
