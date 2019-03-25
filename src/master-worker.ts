import * as cluster from 'cluster';
import * as express from 'express';
import * as expressFileupload from 'express-fileupload';
import * as fs from 'fs';
import * as fstream from 'fstream';
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
            this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                next();
            });
        }

        app.post('/api/job', (req: express.Request, res: express.Response) => {
            const jobDefinition = {
                name: req.params.name
            };
            if (req.files != null && req.files.job != null) {
                const uploadedFile: expressFileupload.UploadedFile = isArray(req.files.job) ? req.files.job[0] : req.files.job;
                this.db.storeJobDefinition(jobDefinition, (jobDefinitionDBO: IJobDefinitionDBO) => {
                    res.set('Content-Type', 'application/json');
                    this.storeToDisk(uploadedFile.data, jobDefinitionDBO._id || '');

                    res.json({ id: jobDefinitionDBO._id });
                });
            } else {
                res.json({ id: null });
            }

        });

        app.post('/api/config', (req: express.Request, res: express.Response) => {
            if (req.files != null && req.files.config) {
                const uploadedFile: expressFileupload.UploadedFile = isArray(req.files.config) ? req.files.config[0] : req.files.config;
                this.db.storeJobConfig(JSON.parse(uploadedFile.data.toString()) as IJobConfig, (jobConfig) => {
                    res.set('Content-Type', 'application/json');
                    res.json({ id: jobConfig._id });
                });
            } else {
                res.json({ id: null });
            }
        });

        app.post('/api/job/start', (req: express.Request, res: express.Response) => {
            const jobId = req.params.jobId;
            const configId = req.params.configId;
            this.db.findJobDefinition(jobId).then((jobDefinition) => {
                this.db.findJobConfig(configId).then((jobConfig) => {
                    const jobDBO: IJobDBO = {
                        config: jobConfig,
                        jobDefinitionId: jobId,
                        status: JobStatusEnum.STORED,
                    };
                    this.db.storeJob(jobDBO, (job) => {
                        res.set('Content-Type', 'application/json');
                        res.json({ jobDBO });
                    });
                });
            });

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

    private storeToDisk(data: Buffer, jobId: string) {
        const pathZip = path.join(FileProvider.getSystemPath(ConfigProvider.get().tempZipDirectory), jobId + '.zip');
        fs.writeFileSync(pathZip, data);
        FileProvider.createDirectory(`${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobId}`);
        const readStream = fs.createReadStream(pathZip);
        /* tslint:disable:no-unsafe-any */
        const writeStream = fstream.Writer(`${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobId}`);
        /* tslint:enable:no-unsafe-any */
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
