import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidRequestBodyError,
  isAllowedMutationOrigin,
  isValidEmail,
  isValidPassword,
  publicAppUrl,
  readJsonBody,
} from "../lib/requestSecurity.ts";
import { requestIdFrom } from "../lib/serverLog.ts";

test("browser mutations must come from the request origin", () => {
  assert.equal(isAllowedMutationOrigin("POST", "https://marvin.example/api/test", "https://marvin.example"), true);
  assert.equal(isAllowedMutationOrigin("POST", "https://marvin.example/api/test", "https://attacker.example"), false);
  assert.equal(isAllowedMutationOrigin("GET", "https://marvin.example/api/test", "https://attacker.example"), true);
  assert.equal(isAllowedMutationOrigin("POST", "https://marvin.example/api/test", null), true);
  assert.equal(isAllowedMutationOrigin("POST", "https://marvin.example/api/test", null, "same-origin"), true);
  assert.equal(isAllowedMutationOrigin("POST", "https://marvin.example/api/test", null, "cross-site"), false);
});

test("public links use the configured production origin", () => {
  assert.equal(
    publicAppUrl("/reset", "https://poisoned.example/api/auth/recover", {
      APP_URL: "https://marvin.example",
      VERCEL_PROJECT_PRODUCTION_URL: undefined,
      NODE_ENV: "production",
    }),
    "https://marvin.example/reset",
  );
  assert.throws(() => publicAppUrl("/reset", "https://poisoned.example", {
    APP_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    NODE_ENV: "production",
  }));
  assert.throws(() => publicAppUrl("/reset", "https://marvin.example", {
    APP_URL: "http://marvin.example",
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    NODE_ENV: "production",
  }));
  assert.equal(publicAppUrl("/join/token", "https://poisoned.example", {
    APP_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: "marvin.vercel.app",
    NODE_ENV: "production",
  }), "https://marvin.vercel.app/join/token");
});

test("JSON bodies are parsed and bounded by their actual byte length", async () => {
  const parsed = await readJsonBody(new Request("https://marvin.example", {
    method: "POST",
    body: JSON.stringify({ email: "cook@example.com" }),
  }), 1024);
  assert.deepEqual(parsed, { email: "cook@example.com" });

  await assert.rejects(
    readJsonBody(new Request("https://marvin.example", { method: "POST", body: JSON.stringify({ value: "🍲🍲" }) }), 10),
    InvalidRequestBodyError,
  );
  await assert.rejects(
    readJsonBody(new Request("https://marvin.example", { method: "POST", body: "not-json" }), 1024),
    InvalidRequestBodyError,
  );
});

test("authentication values have practical upper and lower bounds", () => {
  assert.equal(isValidEmail("cook@example.com"), true);
  assert.equal(isValidEmail(`${"a".repeat(250)}@example.com`), false);
  assert.equal(isValidPassword("long-enough"), true);
  assert.equal(isValidPassword("short"), false);
  assert.equal(isValidPassword("x".repeat(1025)), false);
});

test("request IDs accept generated identifiers but reject log-injection input", () => {
  assert.equal(requestIdFrom(new Request("https://marvin.example", { headers: { "x-request-id": "123e4567-e89b-12d3-a456-426614174000" } })), "123e4567-e89b-12d3-a456-426614174000");
  assert.equal(requestIdFrom(new Request("https://marvin.example", { headers: { "x-request-id": "bad value" } })), undefined);
});
