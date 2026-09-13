import { expect, test } from "vitest";
import { parseGoalPage, parseBalance } from "./rpc-response";
const goal = { id: "1", owner: "owner", base_denom: "azig", strategy_id: "idle", created_at: "0", position_units: "1", total_deposited: "1", total_withdrawn: "0", status: "active", metadata_commitment: null };
test("canonical goals preserve exact maximum contract integers", () => {
  const g = { ...goal, id: "18446744073709551615", position_units: "340282366920938463463374607431768211455" };
  expect(parseGoalPage({goals:[g]}, "owner")).toEqual([g]);
});
test.each([null, {}, {goals: new Array(101).fill(goal)}, {goals:[goal, goal]}, {goals:[{...goal,id:"2"},goal]}, ...Object.entries({id:[1,"01","18446744073709551616"], owner:["other"], base_denom:["uzig"], strategy_id:["yield"], created_at:["-1","18446744073709551616"], position_units:[1,"01","340282366920938463463374607431768211456"], total_deposited:[null], total_withdrawn:["1e2"], status:["paused"], metadata_commitment:[{},"x".repeat(1025)]}).flatMap(([key, values]) => values.map(value => ({goals:[{...goal,[key]:value}]})))])("rejects malformed goal RPC %j", response => {
  expect(() => parseGoalPage(response,"owner")).toThrow("Invalid Goal Manager response");
});
test("pagination cannot repeat or reverse the previous cursor", () => {
  expect(() => parseGoalPage({goals:[goal]},"owner","1")).toThrow();
});
test.each([0, null,"01","-1","1e3","9".repeat(79)])("rejects noncanonical balance %j", amount => {
  expect(() => parseBalance({balance:{denom:"azig",amount}})).toThrow();
});
test("native bank amounts use the Cosmos 256-bit integer bound", () => {
  const amount = ((1n<<256n)-1n).toString();
  expect(parseBalance({balance:{denom:"azig",amount}})).toBe(amount);
  expect(() => parseBalance({balance:{denom:"azig",amount:(1n<<256n).toString()}})).toThrow();
});
