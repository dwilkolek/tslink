"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var JobDefinition = /** @class */ (function () {
    function JobDefinition() {
        this.name = 'jobs2';
        this.sources = {
            sources2: {
                produce: function () {
                    return Buffer.from(Math.random().toString());
                }
            }
        };
        this.sinks = {
            s3: {
                write: function (data, encoding, done) {
                    done();
                }
            }
        };
        this.transformers = {
            s2: {
                transform: function (data, encoding) {
                    var num = parseFloat(data.toString());
                    return Math.random() > 0.5 ? Buffer.from((num * 10) + 'asdasdsa') : undefined;
                }
            }
        };
        this.connections = [{
                from: 'sources2',
                to: {
                    name: 's2',
                    to: {
                        name: 's3'
                    }
                }
            }];
    }
    return JobDefinition;
}());
exports.JobDefinition = JobDefinition;