import * as fs from 'fs';
import * as path from 'path';
import { ConfigProvider } from './config-provider';
import { FileProvider } from './file-provider';
import { Job } from './job';
import { JobStatusEnum } from './job-status-enum';
import { IJobConfig } from './types/job-config';
import { IJobDBO } from './types/job-dbo';
import { EpDbWorker } from './worker';
export class SlaveWorker extends EpDbWorker {

    public jobs: Job[] = [];

    constructor() {
        super();

        setInterval(() => {
            if (this.jobs.length < ConfigProvider.get().limitJobsPerWorker) {
                this.huntForJobs();
            }
        }, 10000);
    }

    public huntForJobs() {
        this.db.findJobByStatusAndRun(JobStatusEnum.STORED).then((job: IJobDBO) => {
            if (job && job.jobDefinitionId) {
                const config: IJobConfig = {
                    deleteWorkspaceOnError: false,
                    deleteWorkspaceOnFinish: false,
                    entryFile: 'index.js',
                    name: 'default',
                    recoverOnFail: false,
                };
                Object.assign(config, job.config);
                if (job._id) {
                    this.runJob(job._id, job.jobDefinitionId, config);
                }
            }
        });
    }

    public runJob = (jobId: string, jobDefinitionId: string, config: IJobConfig) => {
        const jobDefinitionDirectory = path.resolve(
            `${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobDefinitionId}/`,
        );
        const workspaceDirectory = path.resolve(
            `${FileProvider.getSystemPath(ConfigProvider.get().workspaceDirectory)}/${jobId}/`,
        );
        (async (self) => {
            console.log(jobId, 'jobDefinitionDirectory: ', jobDefinitionDirectory);
            console.log(jobId, 'workspaceDirectory: ', workspaceDirectory);
            FileProvider.createDirectory(workspaceDirectory);
            const jobfilename: string = path.join(jobDefinitionDirectory, config.entryFile);
            /* tslint:disable:no-unsafe-any */
            const fns = await import(jobfilename);

            if (fns.beforeCreate) {
                fns.beforeCreate(config, workspaceDirectory, () => {
                    this.spawnJob(jobId, fns, config, workspaceDirectory, jobDefinitionId);
                });
            } else {
                this.spawnJob(jobId, fns, config, workspaceDirectory, jobDefinitionId);
            }
            /* tslint:enable:no-unsafe-any */

        })(this).catch((e) => {
            console.log('Update to FAILED_TO_START', jobId, e);
            this.updateError(jobId, JobStatusEnum.FAILED_TO_START, config, workspaceDirectory, jobDefinitionId, e);
        });
    }

    public spawnJob(jobId: string, mod: any, config: IJobConfig, workspaceDirectory: string, jobDefinitionId: string) {
        // tslint:disable-next-line:no-unsafe-any
        const job = new Job(this.db, jobId, mod.default(config, workspaceDirectory), config, workspaceDirectory);
        this.jobs.push(job);
        job.run()
            .then((jobResolve: Job) => {
                let index = -1;
                this.jobs.forEach((j, i) => {
                    if (jobResolve._id === j._id) {
                        index = i;
                    }
                });
                this.jobs.splice(index, 1);
                this.updateFinished(jobId, config, workspaceDirectory, jobDefinitionId, jobResolve);
                // tslint:disable-next-line:no-unsafe-any
                if (mod.afterDestroy) {
                    // tslint:disable-next-line:no-unsafe-any
                    mod.afterDestroy(config, workspaceDirectory);
                }
                console.log('Update to FINISHED', jobId);

            })
            .catch((e) => {
                console.log('Update to FAILED', jobId, e);
                this.updateError(jobId, JobStatusEnum.FAILED, config, workspaceDirectory, jobDefinitionId, e);
            });
    }

    public updateError(jobId: string, status: JobStatusEnum, config: IJobConfig, workspaceDirectory: string,
                       jobDefinitionId: string, error: any, jobResolved?: Job) {
        const up: IJobDBO = {
            _id: jobId,
            config,
            error,
            jobDefinitionId,
            statistics: jobResolved && jobResolved.counterStore.json() || null,
            status,
        };
        this.db.updateJob(up, () => {
            if (config.deleteWorkspaceOnError) {
                FileProvider.rmdirAsync(workspaceDirectory, () => {
                    console.log('Deleted workspace ', jobId);
                });
            }
        });
    }

    public updateFinished(jobId: string, config: IJobConfig, workspaceDirectory: string, jobDefinitionId: string, jobResolved: Job) {
        this.db.updateJob({
            _id: jobId,
            config,
            jobDefinitionId,
            statistics: jobResolved.counterStore.json(),
            status: JobStatusEnum.FINISHED,
        }, () => {
            if (config.deleteWorkspaceOnFinish) {
                FileProvider.rmdirAsync(workspaceDirectory, () => {
                    console.log('Deleted workspace on error ', jobId);
                });
            }
        });
    }

}
