import { Job } from "./job";
import { EpDbWorker } from "./worker";
import { ConfigProvider } from "./config-provider";
import { JobDefinitionDBO } from "./db/job-definition-dbo";
import { JobStatusEnum } from "./job-status-enum";
import { JobDBO } from "./db/job-dbo";
import { join } from "path";
import { JobConfigDBO } from "./db/job-config-dbo";
import { FileProvider } from "./file-provider";
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
            fs.mkdirSync(FileProvider.getSystemPath(ConfigProvider.get().tempJobDir), 0o744);
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
        const newDir = FileProvider.getSystemPath(dir);
        console.log(dir, newDir)
        const jobFilename = path.join(newDir, 'job.js');
        const configFilename = path.join(newDir, 'config.json');
        fs.mkdirSync(newDir, 0o744);
        console.log('Created job directory', newDir)
        fs.writeFileSync(`${newDir}/pid-${process.pid}`, '');
        fs.writeFileSync(jobFilename, jobDefinitionDBO.jobString);
        fs.writeFileSync(configFilename, JSON.stringify(config));
        return jobFilename;
    }


    public runJob = (jobFilename: string, config: JobConfigDBO) => {
        (async () => {
            let fns = await import(jobFilename);
            const job = new Job(fns.default(), config);
            this.jobs.push(job);
            job.run();
        })().catch(e => {
            console.error(e)
        });
    }

}