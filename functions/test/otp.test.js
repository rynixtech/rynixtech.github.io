const test = require("node:test");
const assert = require("node:assert/strict");
const { createOtp, hashOtp, safeEqual, normalizeEmail, assertPassword, emailKey } = require("../otp");

test("creates a six digit OTP", () => assert.match(createOtp(), /^\d{6}$/));
test("OTP hashes are scoped to the flow and email", () => { const args = { secret: "test-secret", flow: "signup", email: "User@Example.com", code: "123456" }; const hash = hashOtp(args); assert.ok(safeEqual(hash, hashOtp({ ...args, email: "user@example.com" }))); assert.equal(safeEqual(hash, hashOtp({ ...args, flow: "password-reset" })), false); assert.equal(safeEqual(hash, hashOtp({ ...args, code: "654321" })), false); });
test("normalizes emails and rejects invalid input", () => { assert.equal(normalizeEmail(" User@Example.com "), "user@example.com"); assert.throws(() => normalizeEmail("bad")); assert.equal(emailKey("User@Example.com"), emailKey("user@example.com")); });
test("requires an eight character password", () => { assert.throws(() => assertPassword("short")); assert.doesNotThrow(() => assertPassword("long-enough")); });
