import { Job } from "./job";
import { EpDbWorker } from "./worker";
import { ConfigProvider } from "./config-provider";
import { JobDefinitionDBO } from "./db/job-definition-dbo";
import { JobStatusEnum } from "./job-status-enum";
import { JobDBO } from "./db/job-dbo";
import { join } from "path";
import { JobConfigDBO } from "./db/job-config-dbo";
const fs = require('fs');
const path = require('path');

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
        this.createDirForTempJobs();
        setInterval(() => {
            if (this.jobs.length < ConfigProvider.get().limitJobsPerWorker) {
                this.huntForJobs();
            }
        }, 10000)
    }

    createDirForTempJobs() {
        try {
            fs.mkdirSync(ConfigProvider.get().tempJobDir, 0o744);
        } catch (e) { };
        try {
            fs.mkdirSync(this.getSystemPath(ConfigProvider.get().tempJobDir), 0o744);
        } catch (e) { };
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
        const newDir = this.getSystemPath(dir);
        console.log(dir, newDir)
        const jobFilename = `${newDir}/job.js`;
        const configFilename = `${newDir}/config.json`;
        fs.mkdirSync(newDir, 0o744);
        fs.writeFileSync(`${newDir}/pid-${process.pid}`, '');
        fs.writeFileSync(jobFilename, jobDefinitionDBO.jobString);
        fs.writeFileSync(configFilename, JSON.stringify(config));
        return jobFilename;
    }

    getSystemPath(file: string) {
        return path.join(path.dirname(process.execPath), file);
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