import { getBoss, MENU_IMAGE_JOB, processMenuImageJob } from "@/queue/image-generation";

async function main() {
  const boss = await getBoss();
  await boss.work(MENU_IMAGE_JOB, { batchSize: 1 }, async (jobs) => {
    const [job] = jobs;
    if (!job) {
      return;
    }

    await processMenuImageJob(job.data as { menuItemId: string; imageId: string });
  });

  console.log("pg-boss worker started");
}

main().catch((error) => {
  console.error("Worker failed to start", error);
  process.exit(1);
});
