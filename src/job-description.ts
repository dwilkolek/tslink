export interface JobDescription {
    name: string,
    connections: Connection[];
    sources: { [key: string]: SourceDescription };
    transformers: { [key: string]: TransformDescription };
    sinks: { [key: string]: SinkDescription };
}


export interface SourceDescription {
    size?: number;
    produce: (next: (buffer:Buffer) => void, finished: () => void) => void;
}

export interface TransformDescription {
    transform: (data: Buffer, encoding: string) => Buffer | undefined;
}

export interface SinkDescription {
    write: (data: Buffer, encoding: string, done: () => void) => void;
}

export interface ConnectionNext {
    name: string;
    to?: ConnectionNext;
}

export interface Connection {
    from: string;
    to: ConnectionNext;
}