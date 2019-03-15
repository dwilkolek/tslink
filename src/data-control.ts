import * as Rx from "rxjs";
export class DataControl {

    subjects: { [key: string]: Rx.Subject<any>; } = {};
    counters: { [key: string]: number } = {}
    add(name: string) {
        this.counters[name] = 0;
        this.subjects[name] = new Rx.Subject<any>();
    }

    passTo(name: string, data:any) {
        console.log('Passing to '+ name , data)
        this.counters[name]++;
        this.subjects[name].next(data);
    }

    // subscribeTo(name: string, subscriber: (passData: (data: any) => void, data?: any) => void) {
    //     this.subjects[name].subscribe((data) => {
    //         subscriber((data) =>)
    //     })
    // }

}