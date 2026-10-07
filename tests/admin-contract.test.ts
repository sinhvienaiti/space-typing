import { describe, expect, it } from "vitest";
import { SPACE_TYPING_ADMIN_CONTRACT, SPACE_TYPING_ADMIN_CONTRACT_REVISION } from "../src/admin/contract";

describe("Space Typing Admin contract V1", () => {
  it("exports a stable versioned contract for parent Admin consumers", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT_REVISION).toBe("space-typing-admin-v1");
    expect(SPACE_TYPING_ADMIN_CONTRACT.schemaVersion).toBe(1);
    expect(SPACE_TYPING_ADMIN_CONTRACT.gameId).toBe("space-typing");
  });
  it("exposes canonical B06 routes including Bosses and Worlds & Stages", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.routes).toEqual(expect.arrayContaining([
      { id:"ships",path:"/admin/space-typing/ships",label:"Ships" },
      { id:"equipment",path:"/admin/space-typing/equipment",label:"Equipment" },
      { id:"skills",path:"/admin/space-typing/skills",label:"Skills" },
      { id:"enemies",path:"/admin/space-typing/enemies",label:"Enemies" },
      { id:"bosses",path:"/admin/space-typing/bosses",label:"Bosses" },
      { id:"worlds-stages",path:"/admin/space-typing/worlds-stages",label:"Worlds & Stages" },
    ]));
  });
  it("publishes the B06.1 Ships contract without player-state fields",()=>{
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toEqual(expect.arrayContaining(["ships.read","ships.write","ships.preview"]));
    expect(SPACE_TYPING_ADMIN_CONTRACT.ships.authorableFields).not.toContain("selected");
    expect(SPACE_TYPING_ADMIN_CONTRACT.ships.authorableFields).not.toContain("progress");
  });
  it("publishes immutable Equipment identity fields",()=>{
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment.authorableFields).not.toContain("id");
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment.authorableFields).not.toContain("slot");
  });
  it("publishes Skills without derived progression fields",()=>{
    expect(SPACE_TYPING_ADMIN_CONTRACT.skills.authorableFields).not.toContain("level");
    expect(SPACE_TYPING_ADMIN_CONTRACT.skills.authorableFields).not.toContain("masteryUnlocked");
  });
  it("publishes Enemy stage admission without unsupported combat tuning",()=>{
    expect(SPACE_TYPING_ADMIN_CONTRACT.enemies.ids).toHaveLength(35);
    expect(SPACE_TYPING_ADMIN_CONTRACT.enemies.authorableFields).toEqual(["minStage"]);
  });
  it("publishes B06.5 Boss identity contract and keeps combat fields immutable",()=>{
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toEqual(expect.arrayContaining(["bosses.read","bosses.write","bosses.preview"]));
    expect(SPACE_TYPING_ADMIN_CONTRACT.bosses.ids).toHaveLength(26);
    expect(SPACE_TYPING_ADMIN_CONTRACT.bosses).toMatchObject({authorableFields:["name","title"],constraints:{nameMax:100,titleMax:160},previewProtocol:{version:1,command:"pnpm bosses:admin-preview"}});
    for(const unsupported of ["id","role","rank","family","hp","shield","armor","damage","speed","phase","reward","patterns","voice","primary","accent","aura"]){expect(SPACE_TYPING_ADMIN_CONTRACT.bosses.authorableFields).not.toContain(unsupported);}
  });
  it("publishes B06.6 Stage gameplay overrides while keeping structural fields immutable",()=>{
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toEqual(expect.arrayContaining(["stages.read","stages.write","stages.preview"]));
    expect(SPACE_TYPING_ADMIN_CONTRACT.stages).toMatchObject({
      count:1000,
      authorableFields:["enemyBudget","eliteChance","modifierSlots"],
      structuralFields:["stage","galaxy","stageInGalaxy","role","seed"],
      constraints:{
        stage:{min:1,max:1000,integer:true},
        enemyBudget:{minExclusive:0},
        eliteChance:{min:0,max:1},
        modifierSlots:{min:0,max:4,integer:true},
      },
      previewProtocol:{version:1,command:"pnpm stages:admin-preview"},
    });
    for(const immutable of ["stage","galaxy","stageInGalaxy","role","seed"]){
      expect(SPACE_TYPING_ADMIN_CONTRACT.stages.authorableFields).not.toContain(immutable);
    }
  });
  it("keeps Boss and Stage policy at the new-session boundary",()=>{
    expect(SPACE_TYPING_ADMIN_CONTRACT.applyBoundaries).toMatchObject({shipPolicy:"new-session",equipmentPolicy:"new-session",skillPolicy:"new-session",enemyPolicy:"new-session",bossPolicy:"new-session",stagePolicy:"new-session"});
  });
});
