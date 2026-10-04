import {
  createWarpCharge,
  isValidWarpCharge,
  WARP_POLICY,
  type WarpCharge,
} from "../economy/warp-charge";
import type { InputMode } from "../input/mode";
import { MAX_ASCENSION_TIER } from "../progression/ascension";
export type SortieContext = {
  stage: number;
  tier: number;
  activity: "campaign" | "hidden";
  inputMode: InputMode;
  gameplayMode: "combat" | "recall";
  difficulty: string;
  vocabulary: string;
  contentVersion: string;
  seed: number;
};
export type Sortie = {
  id: string;
  context: SortieContext;
  phase: "prepared" | "active" | "defeat-pending";
  activeCost: number;
  reserveCost: number;
  reviveSequence: number;
};
export type AccountReceipt = {
  id: string;
  fingerprint: string;
  kind: string;
  revision: number;
};
export type AccountState = {
  version: 1;
  policy: string;
  profileId: string;
  generation: string;
  revision: number;
  fence: number;
  owner: string;
  barrier: number;
  writeSequence: number;
  intentSequence: number;
  warp: WarpCharge;
  attempt: Sortie | null;
  receipts: AccountReceipt[];
  milestoneGrants: string[];
};
export function newIdentity(): string {
  return crypto.randomUUID();
}
export function createAccountState(now = Date.now()): AccountState {
  return {
    version: 1,
    policy: WARP_POLICY.version,
    profileId: newIdentity(),
    generation: newIdentity(),
    revision: 0,
    fence: 0,
    owner: "",
    barrier: 0,
    writeSequence: 0,
    intentSequence: 0,
    warp: createWarpCharge(now),
    attempt: null,
    receipts: [],
    milestoneGrants: [],
  };
}
const text = (v: unknown, max = 200): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const count = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
export function isValidSortieContext(v: unknown): v is SortieContext {
  if (!v || typeof v !== "object") return false;
  const c = v as SortieContext;
  return (
    count(c.stage) &&
    c.stage >= 1 &&
    c.stage <= 1000 &&
    count(c.tier) &&
    c.tier <= MAX_ASCENSION_TIER &&
    ["campaign", "hidden"].includes(c.activity) &&
    ["typing", "voice", "hybrid"].includes(c.inputMode) &&
    ["combat", "recall"].includes(c.gameplayMode) &&
    text(c.difficulty, 5000) &&
    text(c.vocabulary, 200) &&
    text(c.contentVersion) &&
    count(c.seed)
  );
}
export function isValidAccountState(v: unknown): v is AccountState {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const a = v as AccountState;
  if (
    a.version !== 1 ||
    a.policy !== WARP_POLICY.version ||
    !text(a.profileId) ||
    !text(a.generation) ||
    ![a.revision, a.fence, a.barrier, a.writeSequence, a.intentSequence].every(
      count,
    ) ||
    typeof a.owner !== "string" ||
    a.owner.length > 200 ||
    !isValidWarpCharge(a.warp) ||
    !Array.isArray(a.receipts) ||
    a.receipts.length > 64 ||
    !a.receipts.every(
      (r) =>
        text(r.id) &&
        text(r.fingerprint, 10_000) &&
        text(r.kind) &&
        count(r.revision) &&
        r.revision <= a.revision,
    ) ||
    new Set(a.receipts.map((r) => r.id)).size !== a.receipts.length ||
    !Array.isArray(a.milestoneGrants) ||
    a.milestoneGrants.length > 20_000 ||
    !a.milestoneGrants.every((k) => text(k)) ||
    new Set(a.milestoneGrants).size !== a.milestoneGrants.length
  )
    return false;
  if (a.attempt === null) return true;
  const s = a.attempt;
  return (
    !!s &&
    text(s.id) &&
    isValidSortieContext(s.context) &&
    ["prepared", "active", "defeat-pending"].includes(s.phase) &&
    count(s.activeCost) &&
    count(s.reserveCost) &&
    s.activeCost + s.reserveCost === 10 &&
    count(s.reviveSequence)
  );
}
export type SessionCapability =
  | "account"
  | "rewarded"
  | "practice"
  | "qa"
  | "review"
  | "expedition";
export type WriteTicket = {
  generation: string;
  fence: number;
  barrier: number;
  sequence: number;
  capability: SessionCapability;
};
export type AccountIntent = {
  id: string;
  generation: string;
  fence: number;
  sequence: number;
};
