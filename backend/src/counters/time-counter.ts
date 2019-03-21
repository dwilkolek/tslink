export class TimeCounter {
    totalTime: number = 0;
    currentUnit = 0;
    hits = 0;

    units = ['ms', 's', 'min', 'h', 'd']
    divs = [1000, 60, 60, 24]

    prettyPrint() {
        return `TimeCounter took ${Math.round(this.totalTime * 100) / 100}${this.units[this.currentUnit]}`;
    }

    json() {
        return {
            totalTime: Math.round(this.totalTime * 100) / 100,
            unit: this.units[this.currentUnit]
        };
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
            newTime = newTime / this.divs[i];
        }
        return newTime;
    }
}