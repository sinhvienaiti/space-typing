export const CURRENCY_IDS = [
  "credits",
  "alloy",
  "star-crystal",
  "quantum-core",
] as const;

export type CurrencyId = (typeof CURRENCY_IDS)[number];

export type CurrencyAmounts = {
  credits?: number;
  alloy?: number;
  starCrystal?: number;
  quantumCore?: number;
};

export type CurrencyChip = {
  id: CurrencyId;
  label: string;
  icon: string;
  amount: number;
  cssClass: string;
};

export const CURRENCY_PRESENTATION: Record<
  CurrencyId,
  Omit<CurrencyChip, "amount">
> = {
  credits: {
    id: "credits",
    label: "Credits",
    icon: "₡",
    cssClass: "currency-credits",
  },
  alloy: {
    id: "alloy",
    label: "Alloy",
    icon: "⬢",
    cssClass: "currency-alloy",
  },
  "star-crystal": {
    id: "star-crystal",
    label: "Star Crystal",
    icon: "✧",
    cssClass: "currency-star-crystal",
  },
  "quantum-core": {
    id: "quantum-core",
    label: "Quantum Core",
    icon: "◉",
    cssClass: "currency-quantum-core",
  },
};

function safeAmount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function amountFor(
  id: CurrencyId,
  amounts: CurrencyAmounts,
): number {
  if (id === "credits") return safeAmount(amounts.credits);
  if (id === "alloy") return safeAmount(amounts.alloy);
  if (id === "star-crystal") return safeAmount(amounts.starCrystal);
  return safeAmount(amounts.quantumCore);
}

export function currencyChips(
  amounts: CurrencyAmounts,
  options: {
    includeZero?: boolean;
  } = {},
): CurrencyChip[] {
  const includeZero = options.includeZero === true;
  return CURRENCY_IDS.flatMap((id) => {
    const amount = amountFor(id, amounts);
    if (!includeZero && amount <= 0) return [];
    return [{
      ...CURRENCY_PRESENTATION[id],
      amount,
    }];
  });
}

export function currencyAccessibleText(
  amounts: CurrencyAmounts,
  options: {
    includeZero?: boolean;
    signed?: boolean;
  } = {},
): string {
  const prefix = options.signed === true ? "+" : "";
  const chips = currencyChips(amounts, {
    includeZero: options.includeZero,
  });
  if (chips.length === 0) return "Free";
  return chips
    .map((chip) =>
      prefix + chip.amount.toLocaleString() + " " + chip.label,
    )
    .join(" + ");
}
