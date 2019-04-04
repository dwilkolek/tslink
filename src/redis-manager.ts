import IORedis from 'ioredis';
import { ConfigProvider } from './config-provider';

export class RedisManager {

    private _redis?: IORedis.Redis;

    public get(): IORedis.Redis {
        if (!this._redis) {
            this._redis = new IORedis(ConfigProvider.get().redis.port, ConfigProvider.get().redis.host);
        }
        return this._redis;

    }

}
