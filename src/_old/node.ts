// import Stream from 'stream';
// export class Node {

//     toNode?: ((data: any) => string) | string;
//     processed?: number;
//     isProducer?: boolean = false;

//     constructor(node: Node) {
//         this.toNode = node.toNode;
//         this.processed = 0;
//     }
// }

// export class ProducerNode extends Node {
//     stream: Stream.Readable;
//     produce: (produce: (data: any) => void) => void;
//     constructor(node: ProducerNode) {
//         super(node);
//         this.isProducer = true;
//         this.produce = node.produce;
//         this.stream = new Stream.Readable();
//     }

// }

// export class JobNode extends Node {
//     process: (data?: any) => any;
//     stream: Stream.Writable;
//     constructor(node: JobNode) {
//         super(node);
//         this.process = node.process;
//         this.stream = new Stream.Writable();
//     }
// }