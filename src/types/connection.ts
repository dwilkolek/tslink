import { IConnectionNext } from './connection-next';

export interface IConnection {
    from: string;
    to: IConnectionNext[];
}
