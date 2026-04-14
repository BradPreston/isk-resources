import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export const resourceQueue = new Queue('resource-task', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 }
    }
});