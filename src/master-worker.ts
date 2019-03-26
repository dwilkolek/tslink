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
import { FileProvider } from './file-provider';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { IJobDBO } from './types/job-dbo';
import { IJobDefinition } from './types/job-definition';
import { IJobDefinitionDBO } from './types/job-definition-dbo';
import { EpDbWorker } from './worker';

export class MasterWorker extends EpDbWorker {
    public app: express.Application;

    public runningJobs = 0;
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
        console.log('> Welcome to epjs >');
        console.log('Master pid:', process.pid);

        if (ConfigProvider.isDev) {
            console.warn('RUNNING IN DEVELOPMENT MODE.');
        }

        this.forkCores();
        this.app = this.initExpress();
        this.createDirectories();
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
            res.set('Content-Type', 'application/json');
            next();
        });

        app.get('/api/job', (req: express.Request, res: express.Response) => {
            this.db.findJobs().then((cursor) => {
                this.collect(cursor, (data) => {
                    res.json(data);
                });
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
            if (req.query.jobId != null && req.query.configId != null) {
                const jobId = req.query.jobId;
                const configId = req.query.configId;
                this.db.findJobDefinition(jobId).then((jobDefinition) => {
                    this.db.findJobConfig(configId).then((jobConfig) => {
                        const jobDBO: IJobDBO = {
                            config: jobConfig,
                            jobDefinitionId: jobId,
                            status: JobStatusEnum.STORED,
                        };
                        /* tslint:enable:no-unsafe-any */
                        this.db.storeJob(jobDBO, (result) => {
                            res.json({id: result.insertedId});
                        });
                    });
                });
            } else {
                res.json({ });
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
        cursor.forEach( (element: T) => {
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
