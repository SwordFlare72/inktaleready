import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Recalculate trending scores every 3 hours
crons.interval(
  "update trending scores",
  { hours: 3 },
  internal.stories.calculateTrendingScores,
  {}
);

export default crons;
