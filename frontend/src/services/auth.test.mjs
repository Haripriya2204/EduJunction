// Login input rules. Run: node src/services/auth.test.mjs
//
// Two separate rules, easy to conflate:
//   1. stray whitespace is forgiven  - a phone keyboard adds it, the student
//      cannot see it, and it is not something they chose to type
//   2. lower case is NOT forgiven    - capitals are required by policy, and
//      the student is told so explicitly
import assert from "node:assert";

// mirrors DETAINED_STUDENTS in db/models.ts (a detained roll + a nearby one)
const DETAINED = "23R21A05DW,25R21A0313";

// what LoginForm.onSubmit and authService.login do to the two fields
const clean = (s) => (s || "").trim();
const isCaps = (s) => s === s.toUpperCase();

// the detained list is matched case-insensitively on purpose: it is a block,
// so it must not be escapable by typing differently
const isDetained = (rollNo) =>
  DETAINED.split(",")
    .map((r) => r.trim().toUpperCase())
    .includes(clean(rollNo).toUpperCase());

// --- 1. whitespace a keyboard added is forgiven -----------------------------
// 23R21A04G4 is the reported case: valid in students25/users, not blocked,
// not detained. Only the invisible stray space failed it.
for (const typed of ["23R21A04G4", "23R21A04G4 ", " 23R21A04G4", "  23R21A04G4  "]) {
  assert.strictEqual(clean(typed), "23R21A04G4", `not trimmed: ${JSON.stringify(typed)}`);
  assert.ok(isCaps(clean(typed)), `wrongly flagged as lower case: ${JSON.stringify(typed)}`);
}

// --- the username === password rule holds after trimming, not before --------
// This is the "Username and password must be your roll number" report: the
// rule is checked before any DB lookup, so an invisible difference between the
// two fields rejects a student whose account is fine. The password field is
// masked, so they cannot see which character differs.
const sameRoll = (u, p) => clean(u) === clean(p);
for (const [u, p] of [
  ["23R21A04G4", "23R21A04G4 "],   // trailing space from the suggestion bar
  ["23R21A04G4 ", "23R21A04G4"],   // ...on the other field
  [" 23R21A04G4 ", "23R21A04G4"],  // both mangled, different ways
]) {
  assert.ok(sameRoll(u, p), `wrongly rejected ${JSON.stringify([u, p])}`);
}

// ...but genuinely different entries must still be rejected.
assert.ok(!sameRoll("23R21A04G4", "23R21A04G5"));
assert.ok(!sameRoll("23R21A04G4", "hunter2"));

// --- 2. lower case is rejected, not silently corrected ---------------------
for (const typed of ["23r21a04g4", "23R21a04G4", " 23r21a04g4 "]) {
  assert.ok(!isCaps(clean(typed)), `lower case slipped through: ${JSON.stringify(typed)}`);
}
// a roll with no letters at all is trivially caps - must not be rejected
assert.ok(isCaps(clean("25R21A0313")) && isCaps(clean("24R21E0006")));

// --- detained students cannot escape by changing case or adding spaces -----
for (const typed of ["23R21A05DW", "23r21a05dw", " 23R21A05DW ", "25r21a0313"]) {
  assert.ok(isDetained(typed), `detained student slipped through: ${JSON.stringify(typed)}`);
}
for (const typed of ["23R21A04G4", "23r21a04g4"]) {
  assert.ok(!isDetained(typed), `wrongly detained: ${JSON.stringify(typed)}`);
}

console.log("login input rules: all checks passed");
