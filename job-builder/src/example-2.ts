export class JobDefinition {
    name = 'jobs2';
    sources = {
        sources2: {
            produce: function () {
                return Buffer.from(Math.random().toString());
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
        from: 'sources2',
        to: {
            name: 's2',
            to: {
                name: 's3'
            }
        }
    }];
}