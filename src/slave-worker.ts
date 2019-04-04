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

    public jobs: Job[] = [];
    public jobPromisses: Array<Promise<Job>> = [];

    public offsets: { [key: string]: any } = {};
    public delete?: boolean = false;
    constructor() {
        super();
        process.on('message', (message) => {
            if (message === 'SIGTERM') {
                Object.keys(this.offsets).forEach((key) => {
                    this.updateRedisForJob(key, true);
                });
                console.error('SIGTERM in process');
                this.jobs.forEach((job) => {
                    job.kill();
                });
                setTimeout(() => {
                    process.exit();
                }, 60000);
            }
        });
        process.on('uncaughtException', (err) => {
            Object.keys(this.offsets).forEach((key) => {
                this.updateRedisForJob(key, true);
            });
            console.error('uncaughtException', err);
        });
        process.on('unhandledRejection', (reason, p) => {
            Object.keys(this.offsets).forEach((key) => {
                this.updateRedisForJob(key, true);
            });
            console.error('unhandledRejection', reason, p);
        });
        process.on('beforeExit', () => {
            Object.keys(this.offsets).forEach((key) => {
                this.updateRedisForJob(key, true);
            });
            console.error('beforeExit');
        });
        setInterval(() => {
            if (this.jobs.length < ConfigProvider.get().limitJobsPerWorker) {
                this.huntForJobs();
            }
        }, 10000);

        setInterval(() => {
            Object.keys(this.offsets).forEach((jobid) => {
                this.updateRedisForJob(jobid);
            });
        }, 30000);
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
                    // TODO: slow as fuck. Store offsets somewhere else.
                    if (ConfigProvider.get().inMemoryOffsetCaching) {
                        if (iJobDbo._id != null) {
                            this.offsets[iJobDbo._id] = offset;
                            callback(true);
                        } else {
                            callback(false);
                        }
                    } else {
                        if (iJobDbo._id != null) {
                            this.redis.get().set(iJobDbo._id, JSON.stringify(offset)).then(() => {
                                callback(true);
                            }, () => {
                                callback(false);
                            });
                        }
                    }
                    // this.db.updateJob({ _id: jobId, offset }, (updateResult) => {
                    //     callback(updateResult != null && updateResult.modifiedCount != null && updateResult.modifiedCount === 1);
                    // });
                },
                iJobDbo.offset,
            );

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
                /* tslint:enable:no-unsafe-any */

            })(this).catch((e) => {
                console.log('Update to FAILED_TO_START', jobId, e);
                this.deleteJobFromList(jobId);
                this.updateError(jobId, JobStatusEnum.FAILED_TO_START, jobContext, jobDefinitionId, e);
            });
        }
    }

    public spawnJob(jobId: string, mod: any, jobContext: JobContext, jobDefinitionId: string) {
        // tslint:disable-next-line:no-unsafe-any
        const jobDefinition = mod.default(jobContext);

        // tslint:disable-next-line:no-unsafe-any
        this.db.updateJob({ _id: jobId, connections: jobDefinition.connections }).then(() => {
            // tslint:disable-next-line:no-unsafe-any
            const job = new Job(this.db, jobId, jobDefinition, jobContext);
            this.jobs.push(job);
            const promise: Promise<Job> = job.run();
            this.jobPromisses.push(promise);
            promise.then((jobResolve: Job) => {
                    this.deleteJobFromList(jobResolve._id);
                    this.updateFinished(jobId, jobContext, jobDefinitionId, jobResolve);
                    // tslint:disable-next-line:no-unsafe-any
                    if (mod.afterDestroy) {
                        // tslint:disable-next-line:no-unsafe-any
                        mod.afterDestroy(jobContext);
                    }
                    console.log('Update to FINISHED', jobId);

                })
                .catch((e) => {
                    console.log('Update to FAILED', jobId, e);
                    this.deleteJobFromList(jobId);
                    this.updateError(jobId, JobStatusEnum.FAILED, jobContext, jobDefinitionId, e, job,
                        // tslint:disable-next-line:no-unsafe-any
                        jobDefinition.progress ? jobDefinition.progress() : 0);
                });
        });
    }

    public updateError(jobId: string, status: JobStatusEnum, jobContext: JobContext,
                       jobDefinitionId: string, error: any, jobResolved?: Job, progress?: number) {
        this.updateRedisForJob(jobId, true);
        const up: IJobDBO = {
            _id: jobId,
            config: jobContext.jobConfig,
            endDateTime: new Date(),
            error,
            jobDefinitionId,
            processId: 0,
            progress,
            statistics: jobResolved && jobResolved.counterStore.json() || null,
            status,
        };
        this.db.updateJob(up).then(() => {
            if (jobContext.jobConfig.deleteWorkspaceOnError) {
                FileProvider.rmdirAsync(jobContext.workspaceDirectory, () => {
                    console.log('Deleted workspace ', jobId);
                });
            }
        });
    }

    public updateFinished(jobId: string, jobContext: JobContext, jobDefinitionId: string, jobResolved: Job) {
        this.updateRedisForJob(jobId, true);
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
                });
            }
        });
    }

    private deleteJobFromList(job_id: string) {
        let index = -1;
        this.jobs.forEach((j, i) => {
            if (job_id === j._id) {
                index = i;
            }
        });
        if (index !== -1) {
            this.jobs.splice(index, 1);
        } else {
            console.error('Failed to remove job from process ', job_id);
        }
    }

    private updateRedisForJob(jobid: string, deleteEntry = false) {
        if (this.offsets[jobid]) {
            this.redis.get().set(jobid, JSON.stringify(this.offsets[jobid])).then(() => {
                if (deleteEntry) {
                    delete this.offsets[jobid];
                    console.log('Redis updated with offsets from worker and deleted from offset object');
                } else {
                    console.log('Redis updated with offsets from worker');
                }

            });
        }
    }
}
