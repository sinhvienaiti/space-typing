import type { EnemyFamilyId } from "../enemies/families";
import type { BossAuraStyle } from "../vfx/combat-fx";
import { galaxyForStage } from "../campaign/stage";
import { worldForStage } from "../worlds/registry";
import { activeBossRuntimeOverride } from "../admin/boss-runtime-policy";
import type { BossRole } from "./model";

export type BossPattern = "aimed" | "fan" | "twin" | "ring" | "rain" | "stream";

export type BossIdentity = {
  id: string; role: BossRole; rank: string; name: string; title: string;
  family: EnemyFamilyId; primary: string; accent: string; aura: BossAuraStyle;
  patterns: readonly BossPattern[]; voice: number;
};
type IdentitySpec = Omit<BossIdentity, "role" | "rank">;

const GALAXY_TYRANTS: readonly IdentitySpec[] = [
  { id: "tyrant-g01", name: "Auriel", title: "the Rainbow Sovereign", family: "rainbow", primary: "#ff8ad8", accent: "#8ff4ff", aura: "rays", patterns: ["fan", "ring", "stream"], voice: 1.2 },
  { id: "tyrant-g02", name: "Vorgrath", title: "Crown of Cinders", family: "devil", primary: "#ff4a1f", accent: "#ffb03a", aura: "embers", patterns: ["twin", "rain", "fan"], voice: 0.72 },
  { id: "tyrant-g03", name: "Nivalis", title: "Voice of the Frozen Choir", family: "frost", primary: "#7fe3ff", accent: "#e6fbff", aura: "snow", patterns: ["ring", "stream", "fan"], voice: 1.1 },
  { id: "tyrant-g04", name: "Sylvarch", title: "Heart of the Ancient Grove", family: "nature", primary: "#6fdc5a", accent: "#ffc1e0", aura: "petals", patterns: ["rain", "twin", "ring"], voice: 0.86 },
  { id: "tyrant-g05", name: "Umbraxis", title: "the Eclipse Hollow", family: "shadow", primary: "#8a5cff", accent: "#ff5ad0", aura: "void", patterns: ["twin", "stream", "ring"], voice: 0.66 },
  { id: "tyrant-g06", name: "Novakern", title: "Forgemaster of the Cosmic Engine", family: "cosmic", primary: "#5fb0ff", accent: "#ffd66a", aura: "lightning", patterns: ["fan", "rain", "stream"], voice: 0.8 },
  { id: "tyrant-g07", name: "Abyssion", title: "Maw of the Black Halo", family: "devil", primary: "#c0263f", accent: "#ff8a4a", aura: "void", patterns: ["ring", "twin", "rain"], voice: 0.6 },
  { id: "tyrant-g08", name: "Polaris", title: "the Frozen Singularity", family: "frost", primary: "#9ab8ff", accent: "#e8f4ff", aura: "stardust", patterns: ["stream", "ring", "fan"], voice: 0.95 },
  { id: "tyrant-g09", name: "Eventide", title: "the Silent Throne", family: "angel", primary: "#ffd98a", accent: "#b89cff", aura: "rays", patterns: ["ring", "rain", "twin"], voice: 0.9 },
  { id: "tyrant-g10", name: "Aeternus", title: "the Cosmic Crown", family: "prism", primary: "#d38bff", accent: "#7ff5ff", aura: "shards", patterns: ["fan", "twin", "rain", "ring", "stream"], voice: 0.75 },
];
const WARDENS: Readonly<Record<EnemyFamilyId, IdentitySpec>> = {
  rainbow:{id:"warden-rainbow",name:"Iridessa",title:"Warden of the Prismatic Tide",family:"rainbow",primary:"#ff9ae0",accent:"#8ff4ff",aura:"bubbles",patterns:["fan","stream"],voice:1.15}, angel:{id:"warden-angel",name:"Seraphiel",title:"Archangel of the Halo Garden",family:"angel",primary:"#ffd98a",accent:"#fff3c4",aura:"rays",patterns:["ring","fan"],voice:1.05}, devil:{id:"warden-devil",name:"Malgorath",title:"Demon Lord of the Furnace",family:"devil",primary:"#ff5a2e",accent:"#ffb03a",aura:"embers",patterns:["twin","fan"],voice:.7}, frost:{id:"warden-frost",name:"Glacia",title:"Queen of the Glacier Choir",family:"frost",primary:"#7fe3ff",accent:"#d8f7ff",aura:"snow",patterns:["stream","ring"],voice:1.1}, prism:{id:"warden-prism",name:"Prismarch",title:"Archon of Refracted Light",family:"prism",primary:"#d38bff",accent:"#7ff5ff",aura:"shards",patterns:["ring","twin"],voice:1}, nature:{id:"warden-nature",name:"Elder Bloomheart",title:"Keeper of the Ancient Grove",family:"nature",primary:"#7ddc5a",accent:"#ffd1e8",aura:"petals",patterns:["rain","fan"],voice:.85}, shadow:{id:"warden-shadow",name:"The Umbral Eye",title:"Watcher of the Eclipse",family:"shadow",primary:"#8a5cff",accent:"#ff5ad0",aura:"void",patterns:["stream","twin"],voice:.7}, cosmic:{id:"warden-cosmic",name:"Astraeon",title:"Emperor of the Star Forge",family:"cosmic",primary:"#6fb6ff",accent:"#ffe08a",aura:"stardust",patterns:["fan","rain"],voice:.82}
};
const LIEUTENANTS: Readonly<Record<EnemyFamilyId, IdentitySpec>> = {
  rainbow:{id:"lieutenant-rainbow",name:"Chroma Knight",title:"Herald of the Rainbow Reach",family:"rainbow",primary:"#ff8ad8",accent:"#ffe27a",aura:"bubbles",patterns:["aimed"],voice:1.25}, angel:{id:"lieutenant-angel",name:"Choir Sentinel",title:"Guardian of the Halo Gate",family:"angel",primary:"#ffe2a0",accent:"#ffffff",aura:"rays",patterns:["fan"],voice:1.15}, devil:{id:"lieutenant-devil",name:"Brimstone Baron",title:"Keeper of the Imp Furnace",family:"devil",primary:"#ff6a3a",accent:"#ffcf5a",aura:"embers",patterns:["twin"],voice:.8}, frost:{id:"lieutenant-frost",name:"Frost Oracle",title:"Seer of the Crystal Drift",family:"frost",primary:"#8fe8ff",accent:"#ffffff",aura:"snow",patterns:["stream"],voice:1.2}, prism:{id:"lieutenant-prism",name:"Prism Sentinel",title:"Lens of the Frozen Prism",family:"prism",primary:"#e0a0ff",accent:"#7ff5ff",aura:"shards",patterns:["ring"],voice:1.1}, nature:{id:"lieutenant-nature",name:"Thornback",title:"Warden of the Bloom Circuit",family:"nature",primary:"#8ce062",accent:"#ffd1e8",aura:"petals",patterns:["rain"],voice:.9}, shadow:{id:"lieutenant-shadow",name:"Night Stalker",title:"Hunter of the Twilight Fen",family:"shadow",primary:"#9a6bff",accent:"#ff6ad8",aura:"void",patterns:["twin"],voice:.78}, cosmic:{id:"lieutenant-cosmic",name:"Forge Golem",title:"Engine of Nebula Works",family:"cosmic",primary:"#7fc0ff",accent:"#ffd66a",aura:"lightning",patterns:["fan"],voice:.72}
};
const RANK_LABEL: Record<BossRole,string>={"major-boss":"Galaxy Tyrant",boss:"World Boss","mini-boss":"Mini Boss"};
function withRole(spec: IdentitySpec, role: BossRole): BossIdentity {
  const override = activeBossRuntimeOverride(spec.id);
  return { ...spec, ...(override?.name !== undefined ? { name: override.name } : {}), ...(override?.title !== undefined ? { title: override.title } : {}), role, rank:RANK_LABEL[role] };
}
export function galaxyTyrant(galaxy:number):BossIdentity { const index=Math.max(0,Math.min(GALAXY_TYRANTS.length-1,Math.floor(galaxy)-1)); return withRole(GALAXY_TYRANTS[index]!,"major-boss"); }
export function bossIdentityForStage(stage:number,role:BossRole):BossIdentity { if(role==="major-boss") return galaxyTyrant(galaxyForStage(stage)); const family=worldForStage(stage).enemyFamilies[0]??"rainbow"; return withRole(role==="boss"?WARDENS[family]:LIEUTENANTS[family],role); }
export function bossFullName(identity:BossIdentity):string { return identity.name+", "+identity.title; }
export function bossPatternForPhase(identity:BossIdentity,phase:number):BossPattern { const patterns=identity.patterns; return patterns[Math.max(0,Math.min(patterns.length-1,phase-1))]??"aimed"; }
export function allBossIdentities():BossIdentity[]{ return [...GALAXY_TYRANTS.map(s=>withRole(s,"major-boss")),...Object.values(WARDENS).map(s=>withRole(s,"boss")),...Object.values(LIEUTENANTS).map(s=>withRole(s,"mini-boss"))]; }
export type BossShot={x:number;y:number;angle:number;speed:number};
export function bossShotGeometry(pattern:BossPattern,index:number,count:number,bossX:number,bossY:number,radius:number,playerX:number,playerY:number,width:number):BossShot { const centered=index-(count-1)/2; const aimFrom=(x:number,y:number)=>Math.atan2(playerY-y,playerX-x); switch(pattern){case"fan":{const y=bossY+18;return{x:bossX,y,angle:aimFrom(bossX,y)+centered*.34,speed:1}}case"twin":{const side=index%2===0?-1:1;const x=bossX+side*radius*.78,y=bossY+radius*.2;return{x,y,angle:aimFrom(x,y)+Math.floor(index/2)*.08*side,speed:1}}case"ring":{const a=Math.PI/2+centered*.75,x=bossX+Math.cos(a)*radius*1.1,y=bossY+Math.sin(a)*radius*.7;return{x,y,angle:aimFrom(x,y),speed:.95}}case"rain":{const x=Math.max(40,Math.min(width-40,playerX+centered*150)),y=34;return{x,y,angle:aimFrom(x,y),speed:1.08}}case"stream":{const y=bossY+18;return{x:bossX,y,angle:aimFrom(bossX,y),speed:Math.max(.55,1-index*.15)}}default:{const y=bossY+18;return{x:bossX,y,angle:aimFrom(bossX,y)+centered*.16,speed:1}}} }
