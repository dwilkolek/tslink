export class Node {
    job: (passData: (data: any) => void, data?: any) => void;
    onError?: (exception: any, data: any) => any;
    count?: number;
    fromNode?: string;
    processed?: number;

    constructor(node:Node) {
        this.job = node.job;
        this.onError = node.onError;
        this.count = node.count;
        this.fromNode = node.fromNode;
        this.processed = 0;
    }
}
