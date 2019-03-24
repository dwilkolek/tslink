import { SlaveWorker } from "./slave-worker";


const worker = new SlaveWorker();


worker.runJob("jobid", {
    name: "asd"
})