import assert from "node:assert/strict";
import test from "node:test";
import { runtimeConfigurationIssues } from "../lib/runtimeConfig.ts";

test("production readiness requires database, private media, and a trusted HTTPS origin", () => {
  assert.deepEqual(runtimeConfigurationIssues({ NODE_ENV: "production" }), [
    "DATABASE_URL is missing",
    "PRIVATE_BLOB_READ_WRITE_TOKEN is missing",
    "APP_URL is missing",
  ]);
  assert.deepEqual(runtimeConfigurationIssues({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://database.example/marvin",
    PRIVATE_BLOB_READ_WRITE_TOKEN: "configured",
    APP_URL: "http://marvin.example",
  }), ["APP_URL must use HTTPS"]);
});

test("Vercel's production host is accepted as a trusted origin fallback", () => {
  assert.deepEqual(runtimeConfigurationIssues({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://database.example/marvin",
    PRIVATE_BLOB_READ_WRITE_TOKEN: "configured",
    VERCEL_PROJECT_PRODUCTION_URL: "marvin.vercel.app",
  }), []);
});
