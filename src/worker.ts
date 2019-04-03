import { DBQueries } from './db-queries';
import { RedisManager } from './redis-manager';

export class TSlinkDbWorker {
    public db: DBQueries = new DBQueries();
    public redis: RedisManager = new RedisManager();
}
