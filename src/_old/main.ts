// import { Job } from './job';
// // import { Node } from './node';
// // import { switchMap } from 'rxjs/operators';

// import * as Rx from "rxjs";
// import process from 'process';
// import { Node, ProducerNode, JobNode } from './node';
// const fs = require('fs');
// var stream = fs.createWriteStream("my_file.txt");
// const { Writable } = require('stream');
// stream.on('finish', () => {
//     console.log('wrote all data to file');
// });
// var s = new Writable();

// navigatingStream()

// class App {
//     constructor(private job: Job) {
//         this.nodeNames.forEach(nodeName => {
//             const node = this.node(nodeName);
//             if (node !== null) {
//                 this.job.nodes[nodeName] = (<ProducerNode>node).produce ? new ProducerNode(<ProducerNode>node) : new JobNode(<JobNode>node);
//             }
//         })
        
//         this.jobRunning = setInterval(() => {
//             const used = process.memoryUsage().heapUsed / 1024 / 1024;
//             console.warn(`The script uses approximately ${Math.round(used * 100) / 100} MB, processed: ${JSON.stringify(this.dataControl.counters)}`);
//         })
//     }
//     processed: number = 0;

//     jobRunning: any;

//     run() {
        




//         this.nodeNames.forEach(nodeName => {
//             const node = this.node(nodeName);
//             const producerPromises = [];
//             if (node != null && node instanceof ProducerNode) {
//                 producerPromises.push(new Promise(resolve => {
//                     node.produce((data) => {
//                         if (node.toNode) {
//                             const destNode = (<JobNode>this.node(node.toNode))
//                             node.stream.pipe(destNode.stream).pipe(destNode.process)
//                         }
//                     })
//                 }));
//             }
//         }
//     }

//         // Promise.all(producerPromises).then(() => {
//         //     clearInterval(this.jobRunning);
//         //     stream.end();
//         //     console.warn("Finished processing", this.dataControl.counters)
//         // });
//         // });



//     // }
//     // onNext(node: JobNode, data: any) {
//     //     const newData = node.process(data);
//     //     if (node.toNode && newData != null) {
//     //         const destNode = <JobNode>this.node(node.toNode);
//     //         setTimeout(() => this.onNext(destNode, newData));
//     //     }
//     // }
//     // runPromise(promise: Promise<any>, node: Node) {
//     //     return promise.then(data => {
//     //         const destNode = <JobNode>this.node(node.toNode, data);
//     //         if (destNode) {
//     //             setTimeout(() => this.runPromise(destNode.job(data), destNode), 100);
//     //         }
//     //     })
//     // }

//     node(nodeName: ((data: any) => string) | string, data?: any) {
//         if (!nodeName) {
//             return null;
//         }
//         const nodeNameFinal = typeof nodeName === 'string' ? nodeName : nodeName(data)
//         return this.job.nodes[nodeNameFinal];
//     }
//     get nodeNames(): string[] {
//         return Object.keys(this.job.nodes);
//     }

// }

// // TODO: store partials in redis, max heap size


// const job: Job = {
//     exitGracefulyTimeout: 10000,
//     nodes: {
//         'source0': {
//             produce: (produce: (data: any) => void, finished: () => void) => {
//                 for (let i = 0; i < 5000000; i++) {
//                     produce(i);
//                 }
//                 finished();
//             },
//             toNode: (data) => {
//                 // console.log(data)
//                 return 'mid';
//             }
//         },
//         'source1': {
//             produce: (produce: (data: any) => void, finished: () => void) => {
//                 for (let i = 0; i < 150000; i++) {
//                     produce(i);
//                 }
//                 finished();
//             },
//             toNode: (data) => {
//                 // console.log(data)
//                 return data % 2 == 0 ? 'start' : 'start2';
//             }
//         },
//         'start': {
//             process: (data?: any) => {
//                 //console.log('start', data)
//                 return data * 1;
//             },
//             toNode: 'mid'
//         },
//         'start2': {
//             process: (data?: any) => {
//                 //console.log('start2', data)
//                 return data * -1;
//             },

//             toNode: 'mid'
//         },
//         'mid': {
//             process: (data?: any) => {
//                 //console.log('mid', data)
//                 return data * 10;
//             },
//             toNode: 'end'
//         },
//         'end': {
//             process: (data?: any) => {
//                 // const used = process.memoryUsage().heapUsed / 1024 / 1024;
//                 // console.warn(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
//                 // stream.write(data + "\n");
//                 // stream.end();
//                 //console.log('end', data)
//                 // return (data * 10);
//                 // fs.writeFile("test", data, function(err:any) {
//                 //     if(err) {
//                 //         return console.log(err);
//                 //     }

//                 //     console.log("The file was saved!");
//                 // }); 
//             }
//         }

//     }
// }

// new App(job).run();

