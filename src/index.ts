import Stream from 'stream';
const Transform = Stream.Transform;

const dup: Stream.Readable = new Stream.Readable();
const tr: Stream.Transform = new Stream.Transform();
const wr: Stream.Writable = new Stream.Writable();
class Data {

    constructor(value: string | number | object) {
        if (typeof value == 'string') {
            this.value = Buffer.from(<string>value);
        } else if (typeof value == 'number') {
            this.value = Buffer.of(8);
            this.value.writeDoubleBE(value, 0);
        } else if (typeof value == 'object') {
            this.value = Buffer.from(JSON.stringify(value));
        }

        this.type = typeof value;

    }

    static write(value: string): Buffer {
        return Buffer.from(<string>value);
    }

    static read(chunk: Buffer) {
        return chunk.toString();
    }
    value: Buffer = Buffer.of();
    type: string;

}
dup.push(Data.write('1'));
dup.push(Data.write('2'));
dup.push(Data.write('3'));
dup.push(Data.write('4.2'));

dup._read = (size) => {
    console.log('size', size)
    return size;
}
wr._write = (chunk: Buffer, encoding, done) => {
    console.log('res', Data.read(chunk));
    done()
}
tr._transform = (chunk: Buffer, encoding, done) => {
    console.log('ch', Data.read(chunk))
    done(null, '' + parseFloat(Data.read(chunk)) * 2)
}
dup.pipe(tr).pipe(wr);


