import assert from "node:assert/strict";
import test from "node:test";
import { emptyDraft, RecordValidationError, validateRecord } from "../src/lib/records.ts";

test("record validation trims text and preserves a car number's leading zeros", () => {
  const values = validateRecord({ ...emptyDraft(), type: "import", productType: " Cement ", merchantName: " Merchant ", carNumber: " 00123-A ", receivedMoney: "12.34", net: "999999" });
  assert.equal(values.productType, "Cement");
  assert.equal(values.merchantName, "Merchant");
  assert.equal(values.carNumber, "00123-A");
  assert.equal(values.receivedMoney, 1234);
  assert.equal(values.externalFees, 0);
  assert.equal("net" in values, false);
});

test("invalid records report individual field errors", () => {
  assert.throws(() => validateRecord({ ...emptyDraft(), merchantName: "M".repeat(121), receivedMoney: "0.001", privateFees2: "-10" }), (error: unknown) => {
    assert.ok(error instanceof RecordValidationError);
    assert.ok(error.fields.type);
    assert.ok(error.fields.productType);
    assert.ok(error.fields.merchantName);
    assert.ok(error.fields.carNumber);
    assert.ok(error.fields.receivedMoney);
    assert.ok(error.fields.privateFees2);
    return true;
  });
});

test("type requires an explicit export or import selection", () => {
  const draft = { ...emptyDraft(), productType: "بضاعة", merchantName: "تاجر", carNumber: "00123", receivedMoney: "100.00" };
  for (const type of ["export", "import"] as const) {
    assert.equal(validateRecord({ ...draft, type }).type, type);
  }
  for (const type of ["", "other", "EXPORT", "تصدير", undefined]) {
    assert.throws(() => validateRecord({ ...draft, type }), (error: unknown) => {
      assert.ok(error instanceof RecordValidationError);
      assert.ok(error.fields.type);
      return true;
    });
  }
});
