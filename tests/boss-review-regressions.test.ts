import * as three from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestGame } from "./helpers/game-harness";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import { bossIdentityForStage } from "../src/boss/identity";
import { BossRelief } from "../src/boss/boss-relief";
import { BossModel3D, type Boss3DRenderPose } from "../src/boss/model-3d-runtime";
import { TYRANT_G01_3D } from "../src/boss/model-3d-contract";
import type { BossState } from "../src/boss/model";
import { drawModularEnemy } from "../src/enemies/renderer";
import * as loader from "../src/render3d/model-loader";
import * as shared from "../src/render3d/shared-renderer";
vi.mock("../src/enemies/renderer", async original => ({...await original<Record<string,unknown>>(),drawModularEnemy:vi.fn(()=>true)}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe("boss review regressions",()=>{
  it("never draws a modular body for G01, including Low and a failed/late model",()=>{
    const game=createTestGame();game.setTestLabMode(true);
    game.startStage(createStageConfig(100),difficultyFor({stage:100,vocabularyLevel:1,mode:"balanced",recentWpm:60,recentAccuracy:96}));
    game.testLabSetSchedulerFrozen(true);game.testLabClearEnemies();expect(game.testLabSpawnBoss()).toBe(true);
    const state=game as unknown as {context:CanvasRenderingContext2D;settings:{visualQuality:string};boss:BossState;bossArrivalAge:number;bossDepthActive():boolean;drawBossDepth(boss:BossState,time:number):void;drawBoss(time:number):void};
    state.context=new Proxy({globalAlpha:1,createRadialGradient:()=>({addColorStop:vi.fn()}),createLinearGradient:()=>({addColorStop:vi.fn()}),measureText:()=>({width:50})} as unknown as CanvasRenderingContext2D,{get:(target,key)=>Reflect.get(target,key)??vi.fn()});
    state.bossArrivalAge=10;
    for(const quality of ["low","medium","high"]){state.settings.visualQuality=quality;state.drawBossDepth(state.boss,10);}
    state.bossDepthActive=()=>false;state.drawBoss(10);
    expect(drawModularEnemy).not.toHaveBeenCalled();game.destroy();
  });
  it("loads the boss quality tier, drops obsolete results and disposes on Low",async()=>{
    const game=createTestGame();
    const state=game as unknown as {settings:{visualQuality:string};loadBossRelief(id:ReturnType<typeof bossIdentityForStage>):void;refreshBossReliefQuality():void;bossRelief:BossRelief|null};
    vi.spyOn(BossRelief,"supported").mockReturnValue(true);
    const pending:((value:BossRelief)=>void)[]=[];
    const load=vi.spyOn(BossRelief,"load").mockImplementation(()=>new Promise(resolve=>pending.push(resolve)));
    const identity=bossIdentityForStage(100,"major-boss");
    state.settings.visualQuality="high";state.loadBossRelief(identity);
    state.settings.visualQuality="medium";state.loadBossRelief(identity);
    const old={dispose:vi.fn()} as unknown as BossRelief, current={dispose:vi.fn()} as unknown as BossRelief;
    pending[0]!(old);await Promise.resolve();expect(old.dispose).toHaveBeenCalledTimes(1);
    pending[1]!(current);await Promise.resolve();expect(state.bossRelief).toBe(current);
    expect(load.mock.calls.map(args=>args[3])).toEqual(["high","medium"]);
    state.settings.visualQuality="low";state.refreshBossReliefQuality();expect(current.dispose).toHaveBeenCalledTimes(1);expect(state.bossRelief).toBeNull();game.destroy();
  });
  it("does not load the legacy large GLB when the manifest is unavailable",async()=>{
    vi.stubGlobal("document",{});vi.stubGlobal("WebGLRenderingContext",class{});
    vi.spyOn(shared,"sharedRenderer").mockResolvedValue({} as three.WebGLRenderer);
    vi.spyOn(loader,"modelUrl").mockResolvedValue(null);
    const load=vi.spyOn(loader,"loadModel");
    expect(await BossModel3D.load(TYRANT_G01_3D,"#fff","#fff")).toBeNull();expect(load).not.toHaveBeenCalled();
  });
  it("selects authored Intro, Hit and Death clips in the real animation controller",()=>{
    const model=new three.Group(),scene=new three.Scene(),pivot=new three.Group(),camera=new three.PerspectiveCamera();
    const mixer=new three.AnimationMixer(model);
    const action=(name:string)=>mixer.clipAction(new three.AnimationClip(name,1,[])).play();
    const idle=action("Boss_Idle"),skill=action("Boss_Skill"),hit=action("Boss_Hit"),death=action("Boss_Death"),intro=action("Boss_Intro");
    const Constructor=BossModel3D as unknown as new(...args:unknown[])=>BossModel3D;
    const boss=new Constructor(three,TYRANT_G01_3D,scene,camera,pivot,model,mixer,idle,skill,[],{},[],"#fff",hit,death,intro);
    const state=boss as unknown as {evaluateAnimation(pose:Boss3DRenderPose,dt:number):void};
    state.evaluateAnimation({introTime:.2} as Boss3DRenderPose,.1);expect(intro.getEffectiveWeight()).toBe(1);expect(skill.getEffectiveWeight()).toBe(0);
    state.evaluateAnimation({introTime:2,heavyHits:0} as Boss3DRenderPose,.1);
    state.evaluateAnimation({introTime:2,heavyHits:1} as Boss3DRenderPose,.1);expect(hit.getEffectiveWeight()).toBeGreaterThan(0);
    state.evaluateAnimation({dying:.5} as Boss3DRenderPose,.1);expect(death.getEffectiveWeight()).toBe(1);expect(hit.getEffectiveWeight()).toBe(0);boss.dispose();
  });
});
