import { Job } from "./job";
import { EpWorker } from "./worker";

export class SlaveWorker implements EpWorker {

    jobs: Job[] = [];

    constructor() {
        process.on('message', msg => {
            console.log('message', msg)
            if (msg.cmd = 'runJob' && !!msg.file) {
                console.log('processing')
                this.runJob(msg.file);
            }
        });
    }

    public runJob = (filelocation: string) => {
        (async () => {
            let fns;
            fns = await import(filelocation)
            const construct = <any>fns[Object.keys(fns)[0]];
            const job = new Job(new construct());
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