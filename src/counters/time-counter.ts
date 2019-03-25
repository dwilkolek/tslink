export class TimeCounter {
    public totalTime: number = 0;
    public currentUnit = 0;
    public hits = 0;

    public units = ['ms', 's', 'min', 'h', 'd'];
    public divs = [1000, 60, 60, 24];

    public prettyPrint() {
        return `TimeCounter took ${Math.round(this.totalTime * 100) / 100}${this.units[this.currentUnit]}`;
    }

    public json() {
        return {
            totalTime: Math.round(this.totalTime * 100) / 100,
            unit: this.units[this.currentUnit],
        };
    }
    public put(time: number) {
        this.totalTime += this.timeToAdd(time);
        if (this.totalTime > this.divs[this.currentUnit] && this.divs[this.currentUnit + 1]) {
            this.totalTime = this.totalTime / this.divs[this.currentUnit];
            this.currentUnit++;
        }
    }

    public timeToAdd(time: number) {
        if (time === 0) {
            return time;
        }
        let newTime = time;
        for (let i = 0; i < this.currentUnit; i++) {
            newTime = newTime / this.divs[i];
        }
        return newTime;
    }
}
