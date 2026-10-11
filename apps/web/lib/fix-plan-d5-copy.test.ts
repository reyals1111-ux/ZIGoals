import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Session U Part 6 (FIX_PLAN D5; FINDINGS Q-PRIV-01, Q-PRIV-02, Q-AUTH-04, Q-SYNC-04): the copy friends read says what the
// code does. The owner approves the wording in the PR; these pin it so a later edit cannot quietly undo it.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const TAMPER = "as long as the app code we serve has not been tampered with";

test("Help and the sync offer qualify end-to-end encryption: served code, and remembered devices", () => {
  for (const path of ["components/help/help-page.tsx", "components/account-sync-offer/sync-offer.tsx"]) {
    const source = read(path);
    expect(source, path).toContain(TAMPER);
    expect(source, path).toMatch(/A device you (chose|choose) to remember can open it too\./);
  }
  expect(read("../../landing/index.html")).toContain(TAMPER.replace("as long as", "That holds as long as"));
});
test("Help: lost a device means revoke, then rotate; the recovery secret is not the only key on a remembered device", () => {
  const help = read("components/help/help-page.tsx");
  expect(help).toContain("<strong>Lost a device?</strong> Revoke it under Settings → Devices and sessions, then rotate the vault key");
  expect(help).toContain("It is the only key to your encrypted data you can write down (a device you chose to remember holds the vault key too)");
  expect(help).not.toContain("It is the only key to your encrypted data, and it is shown only then.");
});
test("deletion says what stays and why; rotation says Health copies are re-encrypted too; the sessions panel drops a stale line", () => {
  expect(read("components/account-deletion.tsx")).toContain("Encrypted copies can remain in our host’s 30-day recovery history. We keep a minimal deletion record (account identifier, dates, which sections) so deleted data cannot come back.");
  expect(read("components/account-deletion.tsx")).not.toContain("Infrastructure backups follow their retention policy.");
  expect(read("components/vault-rotation-controls.tsx")).toContain("encrypts every retained cloud record again, including Health copies already stored.");
  const devices = read("components/account-devices.tsx");
  expect(devices).not.toContain("Domain-key rotation is not available");
  expect(devices).toContain("after losing a device, also rotate the vault key");
  expect(devices).toContain("Showing 50 of {sessions.length} sessions.");
});
test("the landing names which part of the app a record belongs to, in both places", () => {
  expect(read("../../landing/index.html").match(/which part of the app each record belongs to/g)).toHaveLength(2);
});
