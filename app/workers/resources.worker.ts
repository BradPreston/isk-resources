import { Worker, Queue } from "bullmq";
import { redisConnection } from "../lib/redis";
import { fetchResources } from "../lib/resources";

export const resourcesQueue = new Queue("resources-queue", {
  connection: redisConnection,
});

const SYNC = {
  minute: "* * * * *",
  daily: "0 0 * * *",
};

async function registerJobs() {
  const repeatableJobs = await resourcesQueue.getJobSchedulers();

  for (const job of repeatableJobs) {
    await resourcesQueue.removeJobScheduler(job.key);
  }

  await resourcesQueue.add(
    "resource-sync",
    {
      triggeredAt: new Date().toISOString(),
    },
    {
      repeat: { pattern: SYNC.minute },
      jobId: "resource-sync",
    },
  );

  console.log("Daily job registered");
}

const worker = new Worker(
  "resources-queue",
  async (job) => {
    console.log(`Processing job: ${job.name}`, job.data);

    if (job.name === "resource-sync") {
      await fetchResources();
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} completed`));
worker.on("failed", (job, err) =>
  console.error(`❌ Job ${job?.id} failed:`, err),
);

registerJobs().catch(console.error);
