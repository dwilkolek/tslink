import { Job } from "./job";

const jobsDirectory = './jobs';
const fs = require('fs');

export class App {

    private constructor() {

    }
    private static _instance: App = new App();

    public static getInstance() {
        if (!this._instance) {
            this._instance = new App();
        }
        return this._instance;
    }

    jobs: Job[] = [];

    public scanDirectory(): Promise<string[]> {
        return new Promise(resolve => {
            fs.readdir(jobsDirectory, (err: any, files: any[]) => {
                resolve(files.filter(file => {
                    return file.indexOf('.js') === file.length - '.js'.length
                }).map(file => {
                    const filelocation = "./jobs/" + file;
                    return filelocation;
                }));
            });
        });
    }
    public runJob = (filelocation: string) => {
        (async () => {
            let fns;
            fns = await import(filelocation)
            const construct = <any>fns[Object.keys(fns)[0]];
            const job = new Job(new construct());
            job.run();
            this.jobs.push(job);
        })().catch(e => {
            console.error(e)
        });
    }
}