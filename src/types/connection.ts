import { ConnectionNext } from "./connection-next";

export interface Connection {
    from: string;
    to: ConnectionNext;
}