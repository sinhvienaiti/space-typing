import {
  journeySecretNodesForStage,
  type JourneySecretNode,
} from "./journey-map";
import type {
  HiddenContentId,
  HiddenDiscoveryState,
} from "../discovery/hidden-content";

export const SECRET_ROUTE_ACTIONS = [
  "open-black-market",
  "open-hidden-station",
] as const;

export type SecretRouteAction = (typeof SECRET_ROUTE_ACTIONS)[number];

export type SecretRoutePresentation = {
  node: JourneySecretNode;
  eyebrow: "Secret Shop" | "Hidden Station";
  title: string;
  meta: string;
  actionLabel: string;
  action: SecretRouteAction;
};

function presentationForNode(
  node: JourneySecretNode,
): SecretRoutePresentation {
  if (node.kind === "hidden-shop") {
    return {
      node,
      eyebrow: "Secret Shop",
      title: node.name,
      meta:
        "Discovered near Stage " +
        String(node.stage).padStart(3, "0") +
        " · rare merchant route · persisted for this Campaign save",
      actionLabel: "Enter Black Market",
      action: "open-black-market",
    };
  }

  return {
    node,
    eyebrow: "Hidden Station",
    title: node.name,
    meta:
      "Discovered near Stage " +
      String(node.stage).padStart(3, "0") +
      " · concealed Rest Stop · persisted for this Campaign save",
    actionLabel: "Dock at Hidden Station",
    action: "open-hidden-station",
  };
}

export function secretRoutePresentationsForStage(
  stage: number,
  discovery: HiddenDiscoveryState,
): SecretRoutePresentation[] {
  return journeySecretNodesForStage(stage, discovery).map(presentationForNode);
}

export function secretRoutePresentation(
  stage: number,
  discovery: HiddenDiscoveryState,
  id: HiddenContentId,
): SecretRoutePresentation | null {
  const node = journeySecretNodesForStage(stage, discovery).find(
    (entry) => entry.id === id,
  );
  return node === undefined ? null : presentationForNode(node);
}
