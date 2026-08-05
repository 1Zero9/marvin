import assert from "node:assert/strict";
import test from "node:test";
import { booleanRecord, boundedStringList, boundedText, isHttpUrl, optionalBoundedText } from "../lib/apiLimits.ts";

test("text helpers distinguish valid, empty, and invalid values", () => {
  assert.equal(boundedText("  Dinner  ", 20), "Dinner");
  assert.equal(boundedText("", 20), null);
  assert.equal(optionalBoundedText("  ", 20), null);
  assert.equal(optionalBoundedText("x".repeat(21), 20), undefined);
});

test("bounded lists reject oversized and non-text members", () => {
  assert.deepEqual(boundedStringList([" Quick ", "VEGGIE"], { maximumItems: 2, maximumLength: 10, lowercase: true }), ["quick", "veggie"]);
  assert.equal(boundedStringList(["one", "two", "three"], { maximumItems: 2, maximumLength: 10 }), null);
  assert.equal(boundedStringList(["one", 2], { maximumItems: 2, maximumLength: 10 }), null);
});

test("URL and boolean-record helpers reject unsafe shapes", () => {
  assert.equal(isHttpUrl("https://example.com/recipe"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.deepEqual(booleanRecord({ Water: true, Walk: false }, 4, 60), { Water: true, Walk: false });
  assert.equal(booleanRecord({ Water: "yes" }, 4, 60), null);
});
