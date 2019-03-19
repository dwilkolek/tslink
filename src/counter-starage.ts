import { Stream } from "stream";

export class CounterStorage {

    constructor(private jobName:string) {}

    counters: {[key: string] : NodeCounter} = {}
    time: {[key: string] : number} = {}

    putJobTime(name:string, time:number) {
        if (!this.time[name]) {
            this.time[name] = time;
        }

    }

    init(name: string) {
        this.counters[name] = new NodeCounter(name);
    }

    putIn(name:string, buff:Buffer) {
        // console.log('\t', name,this.counters[name].count)
        this.counters[name].putIn(buff);
    }
    putOut(name:string, buff:Buffer) {
        // console.log('\t', name,this.counters[name].count)
        this.counters[name].putOut(buff);
    }
    putTime(name:string, time:number) {
        this.counters[name].putTime(time);
    }
    collectCounterIn(name:string) {
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            this.putIn(name, chunk);
            done(null, chunk);
        }
        return transformStream;
    }
    collectCounterOut(name:string) {
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            this.putOut(name, chunk);
            done(null, chunk);
        }
        return transformStream;
    }

    public inName(name:string) {
        return this.jobName+':'+name+'-in';
    }
    public outName(name:string) {
        return this.jobName+':'+name+'-out';
    }
    prettyPrint() {
        let header = `------------------------------------------------------------\nJob: ${this.jobName}\n`;
        let footer = `\n------------------------------------------------------------\n`;
        let body = Object.keys(this.counters).map(name => {
            return '\t'+this.counters[name].prettyPrint();
        }).join('\n');
        return header + body + footer;
    }

}

export class NodeCounter {
    name: string;
    in: ProcessingCounter;
    out: ProcessingCounter;
    time: TimeCounter;

    constructor(name:string) {
        this.name = name;
        this.in = new ProcessingCounter();
        this.out = new ProcessingCounter();
        this.time = new TimeCounter();
    }

    putIn(buff:Buffer) {
        this.in.put(buff)
    }
    putOut(buff:Buffer) {
        this.out.put(buff)
    }
    putTime(time:number) {
        this.time.put(time);
    }

    prettyPrint() {
        return `Node: ${this.name}:\n\tin:${this.in.prettyPrint(this.name)} \n\tout:${this.out.prettyPrint(this.name)}\n\t${this.time.prettyPrint(this.name)}\n\n`
    }

}
export class TimeCounter {
    avgTime: number = 0;
    hitCount: number = 0;
    prettyPrint(name: string) {
        return `TimeCounter ${name} took  ${this.avgTime * this.hitCount}ms (avg. ${this.avgTime < 1 ? '<1' : this.avgTime}ms, coutner hit: ${this.hitCount})`;
    }

    put(time:number) {
        this.avgTime = (this.avgTime*this.hitCount + time)/(this.hitCount+1);
        this.hitCount++;
    }
}
export class ProcessingCounter {
    count: number = 0;
    size: number = 0;
    sizeMultiplication = 0;
    units = ['b', 'kb', 'mb', 'gb', 'tb', 'pb']
    sizeMultiplicationToUnit(size:number) {
        return this.units[size];
    }
    put(buff:Buffer) {
        this.count++;
        this.size += this.calculateCurrentBuffer(buff.byteLength, this.sizeMultiplication);
        if (this.size > 1024) { //1048576
            this.sizeMultiplication++;
            this.size = this.size/1024;
        }
        // if (this.calculatedSize() > 10000) {
        //     this.size = this.size/1024.0;
        //     this.sizeMultiplication++;
        // }
    }
    calculateCurrentBuffer(length:number, sizeMultiplication: number):number {
        const div = Math.pow(1024, sizeMultiplication);
        return length/1.0/div;
    }
    prettyPrint(name: string) {
        return `ProcessingCounter ${name} processed ${this.count} chunks [${Math.round(this.size*1000)/1000} ${this.sizeMultiplicationToUnit(this.sizeMultiplication)}].`
    }
    prettyStats(name: string) {
        return {
            name: name,
            count: this.count, 
            unit: this.sizeMultiplicationToUnit(this.sizeMultiplication),
            size: this.size
        } 
    }
}