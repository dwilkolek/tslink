import { Job } from "./job";
import { EpDbWorker } from "./worker";
import { ConfigProvider } from "./config-provider";
import { JobStatusEnum } from "./job-status-enum";
import { FileProvider } from "./file-provider";
import { JobConfig } from "./types/job-config";
import { JobDBO } from "./types/job-dbo";
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
        }, 10000)
    }



    huntForJobs() {
        this.db.findJobByStatusAndRun(JobStatusEnum.STORED).then((job: JobDBO) => {
            if (job && job.jobDefinitionId) {
                this.runJob(job._id, job.jobDefinitionId, job.config)
            }
        });
    }




    public runJob = (jobId, jobDefinitionId: string, config: JobConfig) => {
        (async () => {
            const jobDefinitionDirectory = path.resolve(`${FileProvider.getSystemPath(ConfigProvider.get().jobsDirectory)}/${jobDefinitionId}/`);
            const workspaceDirectory = path.resolve(`${FileProvider.getSystemPath(ConfigProvider.get().workspaceDirectory)}/${jobId}/`);
            console.log(jobId, "jobDefinitionDirectory: ", jobDefinitionDirectory);
            console.log(jobId, "workspaceDirectory: ", workspaceDirectory);
            FileProvider.createDirectory(workspaceDirectory);
            const jobfilename: string = path.join(jobDefinitionDirectory, config.entryFile);
            let fns = await import(jobfilename);
            const job = new Job(jobId, fns.default(), config, workspaceDirectory);
            this.jobs.push(job);
            job.run().then((jobResolve: Job) => {
                let index = -1;
                this.jobs.forEach((j, i) => {
                    if (jobResolve._id === j._id) {
                        index = i;
                    }
                })
                this.jobs.splice(index, 1);

                console.log("Update to FINISHED", jobId);
                this.db.updateJob({
                    _id: jobId,
                    config: config,
                    jobDefinitionId: jobDefinitionId,
                    status: JobStatusEnum.FINISHED,
                    statistics: jobResolve.counterStore.json()
                })

            }).catch(e => {
                console.log("Update to FAILED", jobId, e)
                this.db.updateJob({
                    _id: jobId,
                    config: config,
                    jobDefinitionId: jobDefinitionId,
                    status: JobStatusEnum.FAILED,
                    error: e
                })
            })
        })().catch(e => {
            console.log("Update to FAILED_TO_START", jobId, e)
            this.db.updateJob({
                _id: jobId,
                config: config,
                jobDefinitionId: jobDefinitionId,
                status: JobStatusEnum.FAILED_TO_START,
                error: e
            })
        });
    }

}