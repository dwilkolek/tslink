export class ProcessingCounter {
    public count: number = 0;
    public size: number = 0;
    public sizeMultiplication = 0;
    public units = ['b', 'kb', 'mb', 'gb', 'tb', 'pb'];
    public sizeMultiplicationToUnit(size: number) {
        return this.units[size];
    }

    public put(buff: Buffer) {
        this.count++;
        this.size += this.calculateCurrentBuffer(buff.byteLength, this.sizeMultiplication);
        if (this.size > 1024) { // 1048576
            this.sizeMultiplication++;
            this.size = this.size / 1024;
        }
    }

    public calculateCurrentBuffer(length: number, sizeMultiplication: number): number {
        const div = Math.pow(1024, sizeMultiplication);
        return length / 1.0 / div;
    }

    public prettyPrint() {
        return `ProcessingCounter processed ${this.count}
             chunks [${Math.round(this.size * 1000) / 1000}
             ${this.sizeMultiplicationToUnit(this.sizeMultiplication)}].`;
    }

    public json() {
        return {
            count: this.count,
            size: this.size,
            unit: this.sizeMultiplicationToUnit(this.sizeMultiplication),
        };
    }
}
