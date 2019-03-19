import { Job } from "./job";

const jobsDirectory = './jobs';
const fs = require('fs');

fs.readdir(jobsDirectory, (err: any, files: any[]) => {
    files.filter(file => {
        return file.indexOf('.js') === file.length - '.js'.length
    }).forEach(file => {
        const filelocation = "./jobs/" + file;
        runJob(filelocation);
    });
});

const runJob = (filelocation:string) => {
    (async () => {
        let fns;
        fns = await import(filelocation)
        const construct = <any>fns[Object.keys(fns)[0]];
        new Job(new construct()).run();
    })().catch(e => {
        console.error(e)
    });
}
