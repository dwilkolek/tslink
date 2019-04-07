import { Db } from 'mongodb';
import * as path from 'path';
import { ConfigProvider } from './config-provider';
import { FileProvider } from './file-provider';
import { Job } from './job';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { JobContext } from './types/job-context';
import { IJobDBO } from './types/job-dbo';
import { TSlinkWorker } from './worker';
export class SlaveWorker extends TSlinkWorker {

    public job?: Job;

    public offset = {};
    public delete?: boolean = false;

    private progress: number = -1;

    constructor() {
        super();
        process.on('message', (message) => {
            console.log('received message', message);
            // tslint:disable-next-line:no-unsafe-any triple-equals
            if (this.job && message && message.type === 'kill' && this.job._id == message.jobid) {
                this.job.kill('kill');
                // tslint:disable-next-line:no-unsafe-any
            } else if (this.job && message && message.type === 'killAll') {
                this.job.kill('killAll');
            }

        });
        process.on('uncaughtException', this.closeWorker);
        process.on('unhandledRejection', this.closeWorker);
        process.on('beforeExit', this.closeWorker);
        setInterval(() => {
            if (this.job != null) {
                this.updateRedisForJob(this.job._id);
            }
        }, 30000);

        this.huntForJobs();
    }

    public huntForJobs() {
        this.db.findJobByStatusAndRun(JobStatusEnum.STORED).then((job: IJobDBO) => {
            if (job && job.jobDefinitionId) {
                const config: IJobConfig = {
                    deleteWorkspaceOnError: false,
                    deleteWorkspaceOnFinish: false,
                    entryFile: 'index.js',
                    name: 'default',
                    objectMode: true,
                    recoverOnFail: false,
                };
                Object.assign(config, job.config);
                if (job._id) {
                    this.runJob(job, config);
                }
            }
        });
    }

    public runJob = (iJobDbo: IJobDBO, config: IJobConfig) => {
        if (iJobDbo._id != null && iJobDbo.jobDefinitionId) {
            const jobDefinitionId = iJobDbo.jobDefinitionId;
            const jobId = iJobDbo._id;
            this.progress = iJobDbo.progress || -1;
            if (ConfigProvider.get().inMemoryOffsetCaching) {
                // tslint:disable-next-line:no-unsafe-any
                this.offset = iJobDbo.offset;
            }
            const jobDefinitionDirectory = path.resolve(
                `${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobDefinitionId}/`,
            );
            const workspaceDirectory = path.resolve(
                `${FileProvider.getSystemPath(ConfigProvider.get().workspaceDirectory)}/${jobId}/`,
            );

            const jobContext = new JobContext(
                config,
                workspaceDirectory,
                (offset, callback: (stored: boolean) => void) => {
                    if (ConfigProvider.get().inMemoryOffsetCaching) {
                        if (iJobDbo._id != null) {
                            this.offset = offset;
                            callback(true);
                        } else {
                            callback(false);
                        }
                    } else {
                        if (iJobDbo._id != null) {
                            this.redis.get().set(iJobDbo._id, JSON.stringify({ offset, progress: this.progress })).then(() => {
                                callback(true);
                            }, () => {
                                callback(false);
                            });
                        }
                    }
                },
                (progress: number) => {
                    this.progress = progress;
                },
                iJobDbo.offset,
                () => {
                    if (this.job) {
                        this.job.done();
                    }
                });

            (async (self) => {
                console.log('jobId', jobId, '; jobDefinitionDirectory: ',
                    jobDefinitionDirectory, '; workspaceDirectory: ', workspaceDirectory);

                FileProvider.createDirectory(workspaceDirectory);
                const jobfilename: string = path.join(jobDefinitionDirectory, config.entryFile);
                /* tslint:disable:no-unsafe-any */
                const fns = await import(jobfilename);

                if (fns.beforeCreate) {
                    fns.beforeCreate(jobContext, () => {
                        this.spawnJob(jobId, fns, jobContext, jobDefinitionId);
                    });
                } else {
                    this.spawnJob(jobId, fns, jobContext, jobDefinitionId);
                }
            })(this).catch((e) => {
                console.log('Update to FAILED_TO_START', jobId, e);
                this.updateError(jobId, jobContext, jobDefinitionId, e , JobStatusEnum.FAILED_TO_START);
            });
        }
    }

    public spawnJob(jobId: string, mod: any, jobContext: JobContext, jobDefinitionId: string) {
        // tslint:disable-next-line:no-unsafe-any
        const jobDefinition = mod.default(jobContext);

        // tslint:disable-next-line:no-unsafe-any
        this.db.updateJob({ _id: jobId, connections: jobDefinition.connections }).then(() => {
            // tslint:disable-next-line:no-unsafe-any
            this.job = new Job(this.db, jobId, jobDefinition, jobContext, () => {
                return this.progress;
            });
            this.job.run().then((jobResolve: Job) => {
                this.updateFinished(jobId, jobContext, jobDefinitionId, jobResolve);
                console.log('Update to FINISHED', jobId);
            }, (rejected) => {
                console.log('Update to FAILED', jobId, rejected);
                this.updateError(jobId, jobContext, jobDefinitionId, rejected);
            }).catch((e) => {
                console.log('Update to FAILED', jobId, e);
                this.updateError(jobId, jobContext, jobDefinitionId, e);
            });
        });
    }

    public async updateError(jobId: string, jobContext: JobContext,
                             jobDefinitionId: string, error: any, forcedStatus?: JobStatusEnum) {
        await this.updateRedisForJob(jobId);
        const up: IJobDBO = {
            _id: jobId,
            config: jobContext.jobConfig,
            endDateTime: new Date(),
            error,
            jobDefinitionId,
            processId: 0,
            progress: this.progress,
            statistics: this.job && this.job.counterStore.json() || null,
            status: forcedStatus ? forcedStatus : (error === 'kill' ? JobStatusEnum.KILLED : JobStatusEnum.FAILED),
        };
        this.db.updateJob(up).then(() => {
            if (jobContext.jobConfig.deleteWorkspaceOnError) {
                FileProvider.rmdirAsync(jobContext.workspaceDirectory, () => {
                    console.log('Deleted workspace ', jobId);
                    this.closeWorker();
                });
            } else {
                setTimeout(() => {
                    this.closeWorker();
                }, 10000);
            }
        });
    }

    public async updateFinished(jobId: string, jobContext: JobContext, jobDefinitionId: string, jobResolved: Job) {
        this.db.updateJob({
            _id: jobId,
            config: jobContext.jobConfig,
            endDateTime: new Date(),
            jobDefinitionId,
            processId: 0,
            progress: 100,
            statistics: jobResolved.counterStore.json(),
            status: JobStatusEnum.FINISHED,
        }).then(() => {
            if (jobContext.jobConfig.deleteWorkspaceOnFinish) {
                FileProvider.rmdirAsync(jobContext.workspaceDirectory, () => {
                    console.log('Deleted workspace on error ', jobId);
                    this.closeWorker();
                });
            } else {
                this.closeWorker();
            }
        });
    }

    private updateRedisForJob(jobid: string) {
        const storeToRedis: { offset?: any, progress: number } = { progress: this.progress };
        if (this.offset) {
            storeToRedis.offset = this.offset;
        }

        return this.redis.get().set(jobid, JSON.stringify(storeToRedis));
    }

    private async closeWorker() {
        if (this.job) {
            await this.updateRedisForJob(this.job._id);
            process.exit();
        } else {
            process.exit();
        }
    }
}
