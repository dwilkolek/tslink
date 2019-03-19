export class Job {
    name = 'jobs2';
    sources = {
        s1: {
            produce: function (next: any, finished: any) {
                var count = 0;
                var interval = setInterval(function () {
                    count++;
                    next(Buffer.from(Math.random().toString()));
                    if (count >= 500) {
                        clearInterval(interval);
                        finished();
                    }
                });
            }
        }
    };
    sinks = {
        s3: {
            write: function (data: any, encoding: any, done: any) {
                done();
            }
        }
    };
    transformers = {
        s2: {
            transform: function (data: any, encoding: any) {
                var num = parseFloat(data.toString());
                return Math.random() > 0.5 ? Buffer.from((num * 10) + 'asdasdsa') : undefined;
            }
        }
    };
    connections = [{
        from: 's1',
        to: {
            name: 's2',
            to: {
                name: 's3'
            }
        }
    }];
}