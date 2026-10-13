import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SHOP_POLICY_ADMIN_CONTRACT } from "../src/admin/shop-policy-contract";
import { EQUIPMENT_REGISTRY } from "../src/equipment/registry";
import { GRADE_PRESENTATION } from "../src/grades";
import { ITEM_REGISTRY } from "../src/items/registry";

const exportedContract = JSON.parse(
  readFileSync(new URL("../contracts/space-typing-admin-shop.v1.json", import.meta.url), "utf8"),
);

describe("Shop Admin policy contract", () => {
  it("keeps the committed JSON contract exactly aligned with the runtime contract", () => {
    expect(exportedContract).toEqual(JSON.parse(JSON.stringify(SHOP_POLICY_ADMIN_CONTRACT)));
  });

  it("derives product and grade metadata from canonical registries", () => {
    for (const product of SHOP_POLICY_ADMIN_CONTRACT.catalog.items) {
      const item = ITEM_REGISTRY[product.id];
      expect(product).toEqual({
        id: item.id,
        kind: "item",
        name: item.name,
        category: item.category,
        icon: item.icon,
        grade: item.grade ?? null,
      });
    }

    for (const product of SHOP_POLICY_ADMIN_CONTRACT.catalog.equipment) {
      const equipment = EQUIPMENT_REGISTRY[product.id];
      expect(product).toEqual({
        id: equipment.id,
        kind: "equipment",
        name: equipment.name,
        category: equipment.slot,
        tier: equipment.tier,
        icon: equipment.icon,
      });
    }

    for (const grade of SHOP_POLICY_ADMIN_CONTRACT.catalog.grades) {
      expect(grade).toEqual({
        id: grade.id,
        label: GRADE_PRESENTATION[grade.id].label,
        icon: GRADE_PRESENTATION[grade.id].icon,
      });
    }
  });

  it("publishes the canonical economy.shop namespace and production preview protocol", () => {
    expect(SHOP_POLICY_ADMIN_CONTRACT.configNamespace).toBe("economy.shop");
    expect(SHOP_POLICY_ADMIN_CONTRACT.previewProtocol).toMatchObject({
      version: 1,
      available: true,
      plannedCommand: "pnpm shop:admin-preview",
      mutation: false,
    });
    expect(SHOP_POLICY_ADMIN_CONTRACT.runtime.applyBoundary).toBe("new-session+new-shop-instance");
  });
});
