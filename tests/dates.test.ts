import assert from "node:assert/strict";
import test from "node:test";
import { fromDateInput, toDateInput } from "../lib/dates.ts";

test("date inputs preserve valid local calendar dates", () => {
  const leapDay = fromDateInput("2028-02-29");
  assert.equal(Number.isNaN(leapDay.getTime()), false);
  assert.equal(toDateInput(leapDay), "2028-02-29");
});

test("date inputs reject rollovers and non-date strings", () => {
  assert.equal(Number.isNaN(fromDateInput("2026-02-29").getTime()), true);
  assert.equal(Number.isNaN(fromDateInput("2026-04-31").getTime()), true);
  assert.equal(Number.isNaN(fromDateInput("2026-08-04T12:00:00Z").getTime()), true);
  assert.equal(Number.isNaN(fromDateInput("not-a-date").getTime()), true);
});
