import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SHOP_POLICY_ADMIN_CONTRACT } from "../src/admin/shop-policy-contract";

const checkedInContract = JSON.parse(
  readFileSync(new URL("../contracts/space-typing-admin-shop.v1.json", import.meta.url), "utf8"),
);

describe("Shop Admin policy contract", () => {
  it("keeps the checked-in JSON contract in lockstep with the runtime contract", () => {
    expect(checkedInContract).toEqual(SHOP_POLICY_ADMIN_CONTRACT);
  });
});
