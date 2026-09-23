/** Recovery items are actionable only when their required stage snapshot exists. */
export type DeathProtectionStock = {
  salvageAnchors: number;
  stageRevivalCores: number;
  phoenixCores: number;
  hasValidStageEntry: boolean;
};

export function hasUsableDeathProtection(stock: DeathProtectionStock): boolean {
  return (
    stock.salvageAnchors > 0 ||
    (stock.hasValidStageEntry &&
      (stock.stageRevivalCores > 0 || stock.phoenixCores > 0))
  );
}
