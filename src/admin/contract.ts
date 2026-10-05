import contractJson from "../../contracts/space-typing-admin.v1.json";

export type AdminRouteRegistration = {
  id: string;
  path: string;
  label: string;
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
  applyBoundaries: Readonly<Record<string, string>>;
};

export const SPACE_TYPING_ADMIN_CONTRACT =
  contractJson satisfies SpaceTypingAdminContract;

export const SPACE_TYPING_ADMIN_CONTRACT_REVISION =
  SPACE_TYPING_ADMIN_CONTRACT.contractRevision;
