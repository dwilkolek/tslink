import { Stream } from "stream";

export class CounterStorage {

    constructor(private jobName: string) { }

    counters: { [key: string]: NodeCounter } = {}
    time: { [key: string]: number } = {}

    putJobTime(name: string, time: number) {
        if (!this.time[name]) {
            this.time[name] = time;
        }

    }

    init(name: string) {
        this.counters[name] = new NodeCounter(name);
    }

    putIn(name: string, buff: Buffer) {
        // console.log('\t', name,this.counters[name].count)
        this.counters[name].putIn(buff);
    }
    putOut(name: string, buff: Buffer) {
        // console.log('\t', name,this.counters[name].count)
        this.counters[name].putOut(buff);
    }
    putTime(name: string, time: number) {
        this.counters[name].putTime(time);
    }
    collectCounterIn(name: string) {
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            this.putIn(name, chunk);
            done(null, chunk);
        }
        return transformStream;
    }
    collectCounterOut(name: string) {
        const transformStream = new Stream.Transform();
        transformStream._transform = (chunk: Buffer, encoding: string, done) => {
            this.putOut(name, chunk);
            done(null, chunk);
        }
        return transformStream;
    }

    public inName(name: string) {
        return this.jobName + ':' + name + '-in';
    }
    public outName(name: string) {
        return this.jobName + ':' + name + '-out';
    }
    prettyPrint() {
        let header = `------------------------------------------------------------\nJob: ${this.jobName}\n`;
        let footer = `\n------------------------------------------------------------\n`;
        let body = Object.keys(this.counters).map(name => {
            return '\t' + this.counters[name].prettyPrint();
        }).join('\n');
        return header + body + footer;
    }

}

export class NodeCounter {
    name: string;
    in: ProcessingCounter;
    out: ProcessingCounter;
    time: TimeCounter;

    constructor(name: string) {
        this.name = name;
        this.in = new ProcessingCounter();
        this.out = new ProcessingCounter();
        this.time = new TimeCounter();
    }

    putIn(buff: Buffer) {
        this.in.put(buff)
    }
    putOut(buff: Buffer) {
        this.out.put(buff)
    }
    putTime(time: number) {
        this.time.put(time);
    }

    prettyPrint() {
        return `Node: ${this.name}:\n\tin: ${this.in.prettyPrint()} \n\tout: ${this.out.prettyPrint()}\n\ttime: ${this.time.prettyPrint()}\n\n`
    }

}
export class TimeCounter {
    totalTime: number = 0;
    currentUnit = 0;
    hits = 0;

    units = ['ms', 's', 'min', 'h', 'd']
    divs = [1000, 60, 60, 24]

    prettyPrint() {
        return `TimeCounter took ${Math.round(this.totalTime*100)/100}${this.units[this.currentUnit]}`;
    }

    put(time: number) {
        this.totalTime += this.timeToAdd(time);
        if (this.totalTime > this.divs[this.currentUnit] && this.divs[this.currentUnit + 1]) {
            this.totalTime = this.totalTime / this.divs[this.currentUnit];
            this.currentUnit++;
        }
    }

    timeToAdd(time: number) {
        if (time === 0) {
            return time;
        }
        let newTime = time;
        for (let i = 0; i < this.currentUnit; i++) {
            newTime = newTime/this.divs[i];
        }
        return newTime;
    }
}
export class ProcessingCounter {
    count: number = 0;
    size: number = 0;
    sizeMultiplication = 0;
    units = ['b', 'kb', 'mb', 'gb', 'tb', 'pb']
    sizeMultiplicationToUnit(size: number) {
        return this.units[size];
    }
    put(buff: Buffer) {
        this.count++;
        this.size += this.calculateCurrentBuffer(buff.byteLength, this.sizeMultiplication);
        if (this.size > 1024) { //1048576
            this.sizeMultiplication++;
            this.size = this.size / 1024;
        }
        // if (this.calculatedSize() > 10000) {
        //     this.size = this.size/1024.0;
        //     this.sizeMultiplication++;
        // }
    }
    calculateCurrentBuffer(length: number, sizeMultiplication: number): number {
        const div = Math.pow(1024, sizeMultiplication);
        return length / 1.0 / div;
    }
    prettyPrint() {
        return `ProcessingCounter processed ${this.count} chunks [${Math.round(this.size * 1000) / 1000} ${this.sizeMultiplicationToUnit(this.sizeMultiplication)}].`
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