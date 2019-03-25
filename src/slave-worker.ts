import { Job } from './job';
import { EpDbWorker } from './worker';
import { ConfigProvider } from './config-provider';
import { JobStatusEnum } from './job-status-enum';
import { FileProvider } from './file-provider';
import { JobConfig } from './types/job-config';
import { JobDBO } from './types/job-dbo';
const fs = require('fs');
const path = require('path');
export class SlaveWorker extends EpDbWorker {

    jobs: Job[] = [];

    constructor() {
        super();

        setInterval(() => {
            if (this.jobs.length < ConfigProvider.get().limitJobsPerWorker) {
                this.huntForJobs();
            }
        }, 10000);
    }



    huntForJobs() {
        this.db.findJobByStatusAndRun(JobStatusEnum.STORED).then((job: JobDBO) => {
            if (job && job.jobDefinitionId) {
                const config: JobConfig = {
                    deleteWorkspaceOnError: false,
                    name: 'default',
                    recoverOnFail: false,
                    deleteWorkspaceOnFinish: false,
                    entryFile: 'index.js'
                };
                Object.assign(config, job.config);
                this.runJob(job._id, job.jobDefinitionId, config);
            }
        });
    }




    public runJob = (jobId, jobDefinitionId: string, config: JobConfig) => {
        const jobDefinitionDirectory = path.resolve(
            `${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobDefinitionId}/`
        );
        const workspaceDirectory = path.resolve(
            `${FileProvider.getSystemPath(ConfigProvider.get().workspaceDirectory)}/${jobId}/`
        );
        (async (self) => {
            console.log(jobId, 'jobDefinitionDirectory: ', jobDefinitionDirectory);
            console.log(jobId, 'workspaceDirectory: ', workspaceDirectory);
            FileProvider.createDirectory(workspaceDirectory);
            const jobfilename: string = path.join(jobDefinitionDirectory, config.entryFile);
            const fns = await import(jobfilename);

            if (fns.beforeCreate) {
                fns.beforeCreate(config, workspaceDirectory, () => {
                    this.spawnJob(jobId, fns, config, workspaceDirectory, jobDefinitionId);
                });
            } else {
                this.spawnJob(jobId, fns, config, workspaceDirectory, jobDefinitionId);
            }



        })(this).catch(e => {
            console.log('Update to FAILED_TO_START', jobId, e);
            this.updateError(jobId, JobStatusEnum.FAILED_TO_START, config, workspaceDirectory, jobDefinitionId, e);
        });
    }

    spawnJob(jobId: string, mod: any, config: JobConfig, workspaceDirectory, jobDefinitionId) {
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
                mod.afterDestroy && mod.afterDestroy(config, workspaceDirectory);
                console.log('Update to FINISHED', jobId);

            })
            .catch(e => {
                console.log('Update to FAILED', jobId, e);
                this.updateError(jobId, JobStatusEnum.FAILED, config, workspaceDirectory, jobDefinitionId, e);
            });
    }

    updateError(jobId: string, status: JobStatusEnum, config: JobConfig, workspaceDirectory: string,
        jobDefinitionId: string, error: any, jobResolved?: Job) {
        const up: JobDBO = {
            _id: jobId,
            config: config,
            jobDefinitionId: jobDefinitionId,
            status: status,
            error: error
        };
        if (jobResolved) {
            up.statistics = jobResolved.counterStore.json();
        }
        this.db.updateJob(up, () => {
            if (config.deleteWorkspaceOnError) {
                FileProvider.rmdirAsync(workspaceDirectory, () => {
                    console.log('Deleted workspace ', jobId);
                });
            }
        });
    }


    updateFinished(jobId: string, config: JobConfig, workspaceDirectory: string, jobDefinitionId: string, jobResolved: Job) {
        this.db.updateJob({
            _id: jobId,
            config: config,
            jobDefinitionId: jobDefinitionId,
            status: JobStatusEnum.FINISHED,
            statistics: jobResolved.counterStore.json()
        }, () => {
            if (config.deleteWorkspaceOnFinish) {
                FileProvider.rmdirAsync(workspaceDirectory, () => {
                    console.log('Deleted workspace on error ', jobId);
                });
            }
        });
    }


}
