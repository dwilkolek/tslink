import { Job } from "./job";
import { EpDbWorker } from "./worker";
import { ConfigProvider } from "./config-provider";
import { JobDefinitionDBO } from "./db/job-definition-dbo";
import { JobStatusEnum } from "./job-status-enum";
import { JobDBO } from "./db/job-dbo";
import { join } from "path";
import { JobConfigDBO } from "./db/job-config-dbo";
var ObjectId = require('mongodb').ObjectID;
const fs = require('fs');

export class SlaveWorker extends EpDbWorker {

    jobs: Job[] = [];

    constructor() {
        super();
        // process.on('message', msg => {
        //     console.log('message', msg)
        //     if (msg.cmd = 'runJob' && !!msg.id) {
        //         console.log('processing', msg.file, __dirname)
        //         this.db.findJobDefinition(msg.id).then(doc => {
        //             this.runJob(this.storeToDiskJobDefinition(doc));
        //         })
        //     }
        // });
        setInterval(() => {
            if (this.jobs.length < ConfigProvider.get().limitJobsPerWorker) {
                this.huntForJobs();
            }
        }, 1000)
    }

    huntForJobs() {
        this.db.findJobByStatusAndRun(JobStatusEnum.READY).then((job: JobDBO) => {
            if (job && job._id) {
                this.db.findJobDefinition(job.jobDefinitionId).then(jobDef => {
                    this.runJob(this.storeToDiskJobDefinition(jobDef, job.config), job.config)
                })
            }
        });
    }

    storeToDiskJobDefinition(jobDefinitionDBO: JobDefinitionDBO, config: JobConfigDBO) {
        const dir = `${ConfigProvider.get().tempJobDir}/${jobDefinitionDBO._id}-${new Date().getTime()}`
        const jobFilename = `${dir}/job.js`;
        const configFilename = `${dir}/config.json`;
        fs.mkdirSync(dir, 0o744);
        fs.writeFileSync(`${dir}/pid-${process.pid}`, '');
        fs.writeFileSync(jobFilename, jobDefinitionDBO.jobString);
        fs.writeFileSync(configFilename, JSON.stringify(config));
        return jobFilename;
    }


    public runJob = (jobFilename: string, config: JobConfigDBO) => {
        (async () => {
            let fns = await import(jobFilename);
            const job = new Job(new fns.JobDefinition(), config);
            this.jobs.push(job);
            job.run();
        })().catch(e => {
            console.error(e)
        });
    }

}