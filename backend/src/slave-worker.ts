import { Job } from "./job";
import { EpDbWorker } from "./worker";
import { ConfigProvider } from "./config-provider";
var ObjectId = require('mongodb').ObjectID;
const fs = require('fs');

export class SlaveWorker extends EpDbWorker {

    jobs: Job[] = [];

    constructor() {
        super();
        process.on('message', msg => {
            console.log('message', msg)
            if (msg.cmd = 'runJob' && !!msg.id) {
                console.log('processing', msg.file, __dirname)
                this.db.then(db => {
                    db.collection('jobs').findOne({ "_id": new ObjectId(msg.id) }, (err: any, doc: any) => {
                        const dir = `${ConfigProvider.get().tempJobDir}/${msg.id}`
                        const filename = `${dir}/job.js`;
                        fs.mkdirSync(dir, 0o744);
                        fs.writeFileSync(filename, doc.job);
                        this.runJob(filename);
                    });
                });
            }
        });
    }

    public runJob = (filelocation: string) => {
        (async () => {
            let fns = await import(filelocation);
            const job = new Job(new fns.JobDefinition());
            this.jobs.push(job);
            job.run();
        })().catch(e => {
            console.error(e)
        });
    }

    // public scanDirectory(): Promise<string[]> {
    //     return new Promise(resolve => {
    //         fs.readdir(jobsDirectory, (err: any, files: any[]) => {
    //             resolve(files.filter(file => {
    //                 return file.indexOf('.js') === file.length - '.js'.length
    //             }).map(file => {
    //                 const filelocation = "./jobs/" + file;
    //                 return filelocation;
    //             }));
    //         });
    //     });
    // }



}