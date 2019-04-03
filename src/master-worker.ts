import * as cluster from 'cluster';
import * as express from 'express';
import * as expressFileupload from 'express-fileupload';
import * as fs from 'fs';
import * as fstream from 'fstream';
import { Cursor, FilterQuery } from 'mongodb';
import * as os from 'os';
import * as path from 'path';
import { Transform } from 'stream';
import * as unzip from 'unzip';
import { isArray } from 'util';
import { ConfigProvider } from './config-provider';
import { FileProvider } from './file-provider';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { IJobDBO } from './types/job-dbo';
import { IJobDefinition } from './types/job-definition';
import { IJobDefinitionDBO } from './types/job-definition-dbo';
import { TSlinkDbWorker } from './worker';

export class MasterWorker extends TSlinkDbWorker {
    public app: express.Application;

    public runningJobs = 0;
    public abandoneJobsCallback: NodeJS.Timeout;
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

    private timeoutForLostJobs?: NodeJS.Timeout;

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

        this.abandoneJobsCallback = this.getTimeoutForLostJobs();
    }
    public forkCores() {
        const cpus = ConfigProvider.get().cpus || os.cpus().length;
        console.log(`Forking for ${cpus} CPUs`);
        for (let i = 0; i < cpus; i++) {
            cluster.fork();
        }

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
                this.db.storeJobDefinition(jobDefinition, (storeResult) => {
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
                this.db.storeJobConfig(JSON.parse(uploadedFile.data.toString()) as IJobConfig, (storeResult) => {
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
                        const jobDBO: IJobDBO = {
                            config: jobConfig,
                            jobDefinitionId: jobId,
                            name,
                            progress: -1,
                            status: JobStatusEnum.STORED,
                        };
                        /* tslint:enable:no-unsafe-any */
                        this.db.storeJob(jobDBO, (result) => {
                            res.json({ id: result.insertedId });
                        });
                    });
                });
            } else {
                res.json({});
            }
        });

        app.get('*', (req: express.Request, res: express.Response) => {
            const url = path.resolve(path.join(__dirname, ConfigProvider.uiPath));
            if (this.allowedExt.filter((ext) => req.url.indexOf(ext) > 0).length > 0) {
                res.sendFile(`${url}${req.url}`);
            } else {
                res.sendFile(`${url}\\index.html`);
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

    private getTimeoutForLostJobs() {
        const query: FilterQuery<IJobDBO> = {
            $or: [
                {
                    $and:
                        [
                            {
                                processId: {
                                    $nin: Object.keys(cluster.workers).map((workerKey) => {

                                        let pid = -1;
                                        const worker = cluster.workers[workerKey];
                                        if (worker != null) {
                                            if (process.pid !== worker.process.pid) {
                                                pid = worker.process.pid;
                                            }
                                        }
                                        return pid;
                                    }),
                                },
                            },
                            {
                                status: JobStatusEnum.PROCESSING,
                            },
                        ],
                },
                {
                    $and:
                        [
                            { 'config.recoverOnFail': true },
                            { status: JobStatusEnum.FAILED },
                        ],
                },
            ],

        };

        return setTimeout(() => {
            clearTimeout(this.abandoneJobsCallback);
            this.db.findJobs(query).then((cursor) => {
                cursor.forEach((jobdbo) => {
                    jobdbo.processId = 0;
                    jobdbo.status = JobStatusEnum.ABANDONED_BY_PROCESS;
                    if (jobdbo.config != null && jobdbo.config.recoverOnFail === true) {
                        const jobCopy = JSON.parse(JSON.stringify(jobdbo)) as IJobDBO;
                        delete jobCopy._id;
                        jobCopy.status = JobStatusEnum.STORED;
                        jobCopy.previousJob_id = jobdbo._id;
                        jobdbo.endDateTime = new Date();
                        this.db.updateJob(jobdbo, (up) => {
                            console.log(`moved to abandoned ${jobdbo._id} and restore later`);
                            this.db.storeJob(jobCopy, () => {
                                console.log(`restored job ${jobdbo._id} -> ${jobCopy._id}`);
                            });
                        });
                    } else {
                        jobdbo.endDateTime = new Date();
                        this.db.updateJob(jobdbo, (up) => {
                            console.log(`moved to abandoned ${jobdbo._id}`);
                        });
                    }

                });
            });

            this.abandoneJobsCallback = this.getTimeoutForLostJobs();
        }, 10000);

    }

}
