import contractJson from "../../contracts/space-typing-admin.v1.json";

export type AdminRouteRegistration = {
  id: string;
  path: string;
  label: string;
};

type NumericRange = {
  min: number;
  max: number;
};

export type SpaceTypingAdminContract = {
  contractRevision: string;
  schemaVersion: number;
  gameId: string;
  label: string;
  themeId: string;
  configSchemaVersion: number;
  worldMusicCatalogSchemaVersion: number;
  capabilities: readonly string[];
  routes: readonly AdminRouteRegistration[];
  worldMusic: {
    galaxyCount: number;
    worldsPerGalaxy: number;
    worldCount: number;
    assignmentSlots: readonly string[];
    assignmentModes: readonly string[];
    validationBadges: readonly string[];
    previewProtocol: {
      version: number;
      command: string;
    };
  };
  ships: {
    ids: readonly string[];
    authorableFields: readonly string[];
    coreStatKeys: readonly string[];
    constraints: {
      unlockStage: NumericRange & { integer: boolean };
      statBonus: NumericRange;
      visual: {
        silhouettes: readonly string[];
        wingSpan: NumericRange;
        bodyLength: NumericRange;
        engineCounts: readonly number[];
      };
    };
    previewProtocol: {
      version: number;
      command: string;
    };
  };
  applyBoundaries: Readonly<Record<string, string>>;
};

export const SPACE_TYPING_ADMIN_CONTRACT =
  contractJson satisfies SpaceTypingAdminContract;

export const SPACE_TYPING_ADMIN_CONTRACT_REVISION =
  SPACE_TYPING_ADMIN_CONTRACT.contractRevision;
