// import { Observable } from "rxjs/internal/Observable";
// import { OperatorFunction } from "rxjs/internal/types";
import { Node } from './node';
import { Producer } from './producer';

export interface Job {

    // producers: { [key: string]: Producer; };
    nodes: { [key: string]: Node; };
    exitGracefulyTimeout:number;

}