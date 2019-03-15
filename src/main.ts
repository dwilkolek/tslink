import { Job } from './job';
// import { Node } from './node';
// import { switchMap } from 'rxjs/operators';

import * as Rx from "rxjs";
import { DataControl } from './data-control';
import process from 'process';
import { Node } from './node';
// if (process.platform === "win32") {
//     var rl = require("readline").createInterface({
//       input: process.stdin,
//       output: process.stdout
//     });

//     rl.on("SIGINT", function () {
//       process.emit('');
//     });
//   }
const subject = new Rx.Subject();

class App {

    dataControl = new DataControl();

    constructor(private job: Job) {
        this.prepareNodes();
    }

    subjects: Rx.Subject<any>[] = [];

    // prepareProducers() {
    //     Object.keys(this.job.producers).forEach(producerName => {
    //         const producerSubjectName = 'producer-' + producerName;
    //         this.dataControl.add(producerSubjectName);
    //         this.job.producers[producerName].produce((data) => {
    //             this.dataControl.passTo(producerSubjectName, data);
    //         })
    //     });
    // }

    prepareNodes() {

        Object.keys(this.job.nodes).forEach(nodeName => {
            const nodeSubjectName = nodeName;
            this.dataControl.add(nodeSubjectName);
        });

        Object.keys(this.job.nodes).forEach(nodeName => {
            this.job.nodes[nodeName] = new Node(this.job.nodes[nodeName]);
            const node = this.job.nodes[nodeName];
            console.log(node)
            if (node.fromNode) {
                this.dataControl.subjects[node.fromNode].subscribe(data => {
                    try {
                        node.job((newData) => {
                            if (node.processed) {
                                node.processed++
                            } else {
                                node.processed = 1;
                            }
                            this.dataControl.passTo(nodeName, newData)
                        }, data);
                    } catch (e) {
                        node.onError && node.onError(e, data);
                    }
                })
            }
        });

    }

    run() {

        process.on('beforeExit', () => {
            console.info('SIGTERM signal received.');
            const exitPromises: Promise<any>[] = [];
            Object.keys(this.job.nodes).forEach(nodeName => {
                const node = this.job.nodes[nodeName];
                exitPromises.push(
                    new Promise((resolve) => {
                        setInterval(() => {
                            if (node.fromNode) {
                                if (this.dataControl.counters[node.fromNode] == node.processed) {
                                    resolve({ name: nodeName, created: this.dataControl.counters[node.fromNode], processed: node.processed });
                                }
                            } else {
                                this.dataControl.subjects[nodeName].complete()
                                resolve({ name: nodeName, producer: true });
                            }
                        })
                    })
                );
            })

            Promise.all(exitPromises).then((resolutions) => {
                console.log('exitting...', resolutions)
                process.exit(0);
            })
        });

        Object.keys(this.job.nodes).forEach(nodeName => {
            const node = this.job.nodes[nodeName];
            !node.fromNode && node.job(data => {
                this.dataControl.passTo(nodeName, data);
            })
        });
    }
}


const job: Job = {
    exitGracefulyTimeout: 10000,
    nodes: {
        'source1': {
            job: (passData) => {
                for (let i = 0; i < 15654; i++)
                    passData(i)
                // , 2000);
            }
        },
        'start': {
            job: (passData, data) => {
                passData(data * 100);
            },
            fromNode: 'source1',
        },
        'split': {
            job: (passData, data) => {
                setTimeout(() => passData(data - 100), 2999);
            },
            fromNode: 'start',
        },
        'mid': {
            job: (passData, data) => {
                passData(data * 2)
                // throw new Error('Failed you by bug.')
            },
            onError: (error, data) => {
                console.error('ERROR', error, data);
            },
            fromNode: 'start'
        },
        'end': {
            job: (passData, data) => {
                passData(data + 10)
            },
            count: 10,
            fromNode: 'mid'
        }

    }
}

new App(job).run();

