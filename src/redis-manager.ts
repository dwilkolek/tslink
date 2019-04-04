import IORedis from 'ioredis';
import { ConfigProvider } from './config-provider';

export class RedisManager {

    private _redis?: IORedis.Redis;

    public get(): IORedis.Redis {
        if (!this._redis) {
            const options: IORedis.RedisOptions = Object.assign({}, ConfigProvider.get().redis.options) as IORedis.RedisOptions;
            this._redis = new IORedis(ConfigProvider.get().redis.port, ConfigProvider.get().redis.host, options);
        }
        return this._redis;

    }

}
