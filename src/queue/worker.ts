import { startMenuImageWorker } from "@/queue/image-generation";

async function main() {
  await startMenuImageWorker();
  console.log("pg-boss worker started");
}

main().catch((error) => {
  console.error("Worker failed to start", error);
  process.exit(1);
});
