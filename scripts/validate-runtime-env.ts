import { runtimeConfigurationIssues } from "../lib/runtimeConfig.ts";

const issues = runtimeConfigurationIssues({ ...process.env, NODE_ENV: "production" });
if (issues.length) {
  console.error("Production configuration is incomplete:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("Production runtime configuration is present.");
}
