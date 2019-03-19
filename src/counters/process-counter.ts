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