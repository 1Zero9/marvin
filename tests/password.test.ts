import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../lib/password.ts";

test("password hashes are salted and verify asynchronously", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");

  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("malformed password hashes fail closed", async () => {
  assert.equal(await verifyPassword("anything", ""), false);
  assert.equal(await verifyPassword("anything", "salt:not-hex"), false);
  assert.equal(await verifyPassword("anything", `${"a".repeat(32)}:${"b".repeat(128)}:extra`), false);
});
