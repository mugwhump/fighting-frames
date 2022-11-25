
import type * as T from '../types/characterTypes'; //==
import { cloneDeep } from 'lodash';
//hurf

// ------------------------ COLUMN CHANGES -----------------------
export namespace ColChange {
  export const mod12: T.Modify<number> = {type:"modify", old:1, new:2};
  export const mod21: T.Modify<number> = {type:"modify", old:2, new:1};
  export const mod13: T.Modify<number> = {type:"modify", old:1, new:3};
  export const mod23: T.Modify<number> = {type:"modify", old:2, new:3};
  export const mod32: T.Modify<number> = {type:"modify", old:3, new:2};
  export const modHM: T.Modify<string> = {type:"modify", old:"H", new:"M"};
  export const modMH: T.Modify<string> = {type:"modify", old:"M", new:"H"};
  export const modHL: T.Modify<string> = {type:"modify", old:"H", new:"L"};
  export const modLM: T.Modify<string> = {type:"modify", old:"L", new:"M"};
  export const del1: T.Delete<number> = {type:"delete", old:1};
  export const del2: T.Delete<number> = {type:"delete", old:2};
  export const delBB: T.Delete<string> = {type:"delete", old:"BB"};
  export const delH: T.Delete<string> = {type:"delete", old:"H"};
  export const delM: T.Delete<string> = {type:"delete", old:"M"};
  export const add2: T.Add<number> = {type:"add", new:2};
  export const add3: T.Add<number> = {type:"add", new:3};
  export const addBB: T.Add<string> = {type:"add", new:"BB"};
  export const addM: T.Add<string> = {type:"add", new:"M"};
  export const addL: T.Add<string> = {type:"add", new:"L"};
}


// ------------------------ MOVE CHANGES -----------------------
export namespace MoveChanges {
  export const damage12: T.MoveChanges = {damage: ColChange.mod12};
  export const damage21: T.MoveChanges = {damage: ColChange.mod21};
  export const damage13: T.MoveChanges = {damage: ColChange.mod13};
  export const damage23: T.MoveChanges = {damage: ColChange.mod23};
  export const damage32: T.MoveChanges = {damage: ColChange.mod32};
  export const damageDel1: T.MoveChanges = {damage: ColChange.del1};
  export const damageAdd2: T.MoveChanges = {damage: ColChange.add2};
  export const damageAdd3: T.MoveChanges = {damage: ColChange.add3};
  export const heightHM: T.MoveChanges = {height: ColChange.modHM};
  export const heightMH: T.MoveChanges = {height: ColChange.modMH};
  export const heightHL: T.MoveChanges = {height: ColChange.modHL};
  export const heightLM: T.MoveChanges = {height: ColChange.modLM};
  export const heightAddL: T.MoveChanges = {height: ColChange.addL};
  export const heightAddM: T.MoveChanges = {height: ColChange.addM};
  export const heightDelH: T.MoveChanges = {height: ColChange.delH};
  export const moveAddK  : T.MoveChanges = { moveName: {type: "add", new: "K"} };
  export const moveAddKB : T.MoveChanges = { moveName: {type: "add", new: "KB"} };
  export const moveAddKKK : T.MoveChanges = { moveName: {type: "add", new: "KKK"} };
  export const moveAddBB : T.MoveChanges = { moveName: {type: "add", new: "BB"} };
  export const moveDelBB : T.MoveChanges = { moveName: {type: "delete", old: "BB"} };
  export const dmgHeight12HM : T.MoveChanges = {...damage12, ...heightHM};
  export const dmgHeight13HL : T.MoveChanges = {...damage13, ...heightHL};
  export const dmgHeight32LM : T.MoveChanges = {...damage32, ...heightLM};
}
export namespace MoveListChanges {
  export const addK  : T.MoveChangeList = {K: MoveChanges.moveAddK };
  export const addKB : T.MoveChangeList = {KB: MoveChanges.moveAddKB };
  export const addKKK : T.MoveChangeList = {KKK: MoveChanges.moveAddKKK};
  export const delBB : T.MoveChangeList = {BB: MoveChanges.moveDelBB};
}

// ------------------------ COLUMN CONFLICTS -----------------------
export namespace Con {
  export const c1_2v3 : T.ConflictMerge = {yours: ColChange.mod12, theirs: ColChange.mod13};
  export const c1_3_AR : T.ConflictMergeTheirs = {yours: "no-op", theirs: ColChange.mod13, resolution: "theirs"};
  export const cH_MvL : T.ConflictMerge = {yours: ColChange.modHM, theirs: ColChange.modHL};
  export const cAdd_BB_AR : T.ConflictMergeTheirs<T.MoveData> = {yours: "no-op", theirs: ColChange.addBB, resolution: "theirs"};
  export const cDel_BB_AR : T.ConflictMergeTheirs<T.MoveData> = {yours: "no-op", theirs: ColChange.delBB, resolution: "theirs"};
  export const cDel_3_AR : T.ConflictMergeTheirs<T.MoveData> = {yours: "no-op", theirs: ColChange.del1, resolution: "theirs"};
  export const cAdd_L_AR : T.ConflictGenericAutoResolve<"no-op", T.Add<string>, string> = {yours: "no-op", theirs: ColChange.addL, resolution: "theirs"};
  //export const cAdd_BB_AR: T.ConflictGenericAutoResolve<"no-op", T.Add<string>, string> = {yours: "no-op", theirs: ColChange.addBB, resolution: "theirs"};
  export const cAutoNoop: T.ConflictAutoNoop = {yours: "no-op", theirs: "no-op", resolution: "yours"};
}
// ------------------------ MOVE CONFLICTS -----------------------
export namespace MoveCons {
  export const m_dmgHeight : T.ConflictsMerge = {damage: Con.c1_2v3 , height: Con.cH_MvL };
  export const m_addBBDamage : T.ConflictsMergeTheyAdd = {moveName: Con.cAdd_BB_AR as T.ConflictsMergeTheyAdd["moveName"], damage: Con.c1_3_AR as T.ConflictsMergeTheyAdd["damage"] };
  export const m_delBBDamage : T.ConflictsMergeTheyDelete = {moveName: Con.cDel_BB_AR as T.ConflictsMergeTheyDelete["moveName"], damage: Con.cDel_3_AR as T.ConflictsMergeTheyDelete["damage"] };
  export const m_delBBDamageCon : T.ConflictsMergeTheyDeleteYouChange = {moveName: {yours: "no-op", theirs: ColChange.delBB}, damage: {yours: ColChange.mod12, theirs: ColChange.del1}};
  export const m_delBBDamageAdd : T.ConflictsMergeTheyDeleteYouChange = {moveName: {yours: "no-op", theirs: ColChange.delBB}, damage: {yours: ColChange.add3, theirs: "no-op"}};
  export const m_youDelTheyChangeDamageAddHeight : T.ConflictsMergeYouDeleteTheyChange = {moveName: {yours: ColChange.delBB, theirs: "no-op"}, damage: {yours: ColChange.del1, theirs: ColChange.mod13}, height: Con.cAdd_L_AR};
  export const m_youDelTheyChangeDamage : T.ConflictsMergeYouDeleteTheyChange = {moveName: {yours: ColChange.delBB, theirs: "no-op"}, damage: {yours: ColChange.del1, theirs: ColChange.mod13}, height: {yours: ColChange.delH, theirs: "no-op"}};
  //Rebase conflicts
  export function rebCon(change: T.ColumnChange): T.ConflictRebase {
    return {yours: change, theirs: "no-op"}
  }
  export const r_dmgHeight_uncontested : T.ConflictsRebase = {damage: rebCon(ColChange.mod12), height: rebCon(ColChange.modHM)}; //uncontested changes don't make conflicts lol
  export const r_dmgHeight_redundant : T.ConflictsRebase = {damage: Con.cAutoNoop, height: Con.cAutoNoop};
  export const r_dmgHeight : T.ConflictsRebase = {damage: rebCon(ColChange.mod32), height: rebCon(ColChange.modLM)};
  export const r_dmg_stealth_add : T.ConflictsRebase = {moveName: rebCon(ColChange.addBB), damage: rebCon(ColChange.add2)};
  export const r_height_stealth_add : T.ConflictsRebase = {moveName: rebCon(ColChange.addBB), height: rebCon(ColChange.addM)};
  export const r_dmgHeight_stealth_add : T.ConflictsRebase = {moveName: rebCon(ColChange.addBB), damage: rebCon(ColChange.add2), height: rebCon(ColChange.addM)};
  export const r_delDmg_modHeight_stealth_add : T.ConflictsRebase = {moveName: rebCon(ColChange.addBB), damage: Con.cAutoNoop, height: rebCon(ColChange.addM)};
  export const r_moveName_redundant : T.ConflictsRebase = {moveName: Con.cAutoNoop};
  export const r_delBB : T.ConflictsRebase = {moveName: rebCon(ColChange.delBB)};
}

// ------------------------ COLUMN VALUES -----------------------
export namespace Vals {
  export const damage: T.Cols<number> = {damage: 1};
  export const height: T.Cols<string> = {height: "H"};
  export const damage2: T.Cols<number> = {damage: 2};
  export const heightM: T.Cols<string> = {height: "M"};
  export const damage3: T.Cols<number> = {damage: 3};
  export const heightL: T.Cols<string> = {height: "L"};
  export const dmgHeight: T.Cols = {...damage, ...height};
  export const dmgHeight2: T.Cols = {...damage2, ...heightM};
  export const dmgHeight3: T.Cols = {...damage3, ...heightL};
}

// ------------------------ MOVE ORDERS -----------------------
export namespace Order {
  export const baseOrder: T.MoveOrder[] = [{name:"windy moves","isCategory":true},{name:"AA"},{name:"dishonest moves","isCategory":true},{name:"BB","indent":1}];
  export const BBafterAA: T.MoveOrder[] = [{name:"windy moves","isCategory":true},{name:"AA"},{name:"BB","indent":1},{name:"dishonest moves","isCategory":true}];
  export const reversedOrder: T.MoveOrder[] = [...baseOrder].reverse();
  export const addedK: T.MoveOrder[] = [...baseOrder]; addedK.splice(2,0,{name: "K"});
  export const addedKEnd: T.MoveOrder[] = [...baseOrder]; addedKEnd.push({name: "K"});
  export const justKSeries: T.MoveOrder[] = [{name: "K"},{name: "KB", indent:1},{name: "KKK", indent:2}];
  export const justKSeriesNoIndent: T.MoveOrder[] = [{name: "K"},{name: "KB"},{name: "KKK"}];
  export const addedKSeries: T.MoveOrder[] = [...baseOrder]; addedKSeries.splice(2,0,...justKSeries);
  export const threeCategories: T.MoveOrder[] = [{name:"Category 1","isCategory":true},{name:"Category 2","isCategory":true}, {name:"Category 3","isCategory":true}];
  export const categoriesAndKs: T.MoveOrder[] = [threeCategories[0], justKSeries[0],threeCategories[1], justKSeries[1],threeCategories[2], justKSeries[2]];
  export const noBB: T.MoveOrder[] = baseOrder.slice(0,-1);
  export const noBBaddK: T.MoveOrder[] = [...noBB, {name: "K"}];
  export const noBBReverse: T.MoveOrder[] = [...noBB].reverse();
  export const noBBReverseKafterAA: T.MoveOrder[] = [{"name":"dishonest moves","isCategory":true},{"name":"K"},{"name":"AA"},{"name":"windy moves","isCategory":true}];
  export const indentedBB: T.MoveOrder[] = [...noBB, {name:"BB","indent":69}];
  export const unindentedBB: T.MoveOrder[] = [...noBB, {name:"BB"}]; //if BB stealth added

  //export const chgStealthAddBB : T.Modify<T.MoveOrder[]> = {type:"modify", new:unindentedBB, old:noBB};
  //type Chg = {universalPropChanges: {moveOrder: T.Modify<T.MoveOrder[]>}};
  function getChg(chg: T.Modify<T.MoveOrder[]>) {return {moveOrder: chg}};
  function getProps(chg: T.Modify<T.MoveOrder[]>) {return {universalPropChanges: getChg(chg)}};
  export function getCon(yours: T.MoveOrder[], theirs: T.MoveOrder[]): T.ConflictMoveOrder {return {yours: {type:'modify', new:yours, old:baseOrder}, theirs: {type:'modify', new:theirs, old:baseOrder}}};
  export const propsStealthAddBB  = getProps({type:"modify", new:unindentedBB, old:noBB});
  export const chgReverse  = getChg({type:"modify", new:reversedOrder, old:baseOrder});
  export const chgDelBB = getChg({type:"modify", new:noBB, old:baseOrder});
  export const chgAddBBReverse = getChg({type:"modify", new:reversedOrder, old:noBB});
  export const propsAddBBAfterAA = getProps({type:"modify", new:BBafterAA, old:noBB});
  export const chgDelBBaddK = getChg({type:"modify", new:noBBaddK, old:baseOrder});
  export const chgDelBBReverseK = getChg({type:"modify", new:noBBReverseKafterAA, old:baseOrder});
  export const con_you_reverse_they_delBB_addK: T.ConflictsMerge = {moveOrder: getCon(reversedOrder, noBBaddK)};
}


// ------------------------ CHANGEDOCS -----------------------
export namespace ChangeDocs {
  export const talimChanges: Readonly<T.ChangeDoc> = {
    updateDescription: "test",
    createdAt: new Date().toString(),
    createdBy: "testyman",
    baseRevision: "1",
    previousChange: "c1",
    universalPropChanges: { },
    moveChanges: { },
    conflictList: {
      universalProps: { }
    }
  }

  export function newChangeDoc(moveChanges: T.MoveChangeList | undefined, propChanges: T.PropChanges | undefined, conflicts: T.ConflictList | undefined, updateMeta?: boolean): T.ChangeDoc {
    let newDoc = cloneDeep<T.ChangeDoc>(talimChanges);
    if(moveChanges) newDoc.moveChanges = moveChanges;
    else delete newDoc.moveChanges;
    if(propChanges) newDoc.universalPropChanges = propChanges;
    else delete newDoc.universalPropChanges;
    if(conflicts) newDoc.conflictList = conflicts;
    else delete newDoc.conflictList;
    if(updateMeta) {
      newDoc.baseRevision = "2";
      newDoc.previousChange = "c2alt";
    }
    return newDoc;
  }

  export const unchanged: T.ChangeDoc = newChangeDoc(undefined, undefined, undefined, true);
  //changes to AA are uncontested
  export const modAA_dmgBB : T.ChangeDoc = newChangeDoc({AA: MoveChanges.dmgHeight12HM, BB: MoveChanges.damage12}, undefined, undefined, true);
  export const modAA_dmgBB32 : T.ChangeDoc = newChangeDoc({AA: MoveChanges.dmgHeight12HM, BB: MoveChanges.damage32}, undefined, undefined, true);
  export const modAA32_dmgBB12 : T.ChangeDoc = newChangeDoc({AA: MoveChanges.dmgHeight32LM, BB: MoveChanges.damage12}, undefined, undefined, true);
  export const modAA_addBB: T.ChangeDoc = newChangeDoc({AA: MoveChanges.dmgHeight12HM, BB: {...MoveChanges.damageAdd2, ...MoveChanges.moveAddBB}}, undefined, undefined, true);
  export const modAA_stealthBB_conflicts: T.ChangeDoc = {...modAA_dmgBB , conflictList: {BB: MoveCons.r_dmg_stealth_add}};
  export const modAA_stealthBB_yours: T.ChangeDoc = {...modAA_addBB, ...Order.propsStealthAddBB }
  export const modAA_stealthBB_theirs: T.ChangeDoc = newChangeDoc({AA: MoveChanges.dmgHeight12HM}, undefined, undefined, true); //AA change uncontested

  //becomes base without BB
  export const old_modAAtoBase_delBB : T.ChangeDoc = newChangeDoc({AA: {...MoveChanges.damage21, ...MoveChanges.heightMH}, BB: MoveChanges.moveDelBB}, {...Order.chgDelBB}, undefined, false);

  export const old_modAA3_dmgBB_reverse: T.ChangeDoc = newChangeDoc({AA: MoveChanges.dmgHeight13HL, BB: MoveChanges.damage12}, {...Order.chgAddBBReverse}, undefined, false);
  export const modAA3_dmgBB_reverse_theirs: T.ChangeDoc = newChangeDoc({AA: MoveChanges.dmgHeight13HL, BB: {...MoveChanges.moveAddBB, ...MoveChanges.damageAdd2}}, {...Order.chgAddBBReverse}, undefined, true);
  //you stealth add BB but its position is taken from theirs
  export const modAA3_dmgBB_reverse_yours: T.ChangeDoc = {...modAA_addBB, ...Order.propsAddBBAfterAA };

  export const delBBaddK : T.ChangeDoc = newChangeDoc({K: {...MoveChanges.moveAddK, ...MoveChanges.damageAdd3}, BB: MoveChanges.moveDelBB}, {...Order.chgDelBBaddK}, undefined, true);
  export const reverseOrder: T.ChangeDoc = newChangeDoc(undefined, Order.chgReverse, undefined, true);
  export const delBBaddKReverse : T.ChangeDoc = newChangeDoc({K: {...MoveChanges.moveAddK, ...MoveChanges.damageAdd3}, BB: MoveChanges.moveDelBB}, {...Order.chgDelBBReverseK}, undefined, true);
  //export const delBBaddKReverseUnresolvedOrder: T.ChangeDoc = {...delBBaddKReverse, conflictList: {universalProps: Order.con_you_reverse_they_delBB_addK}};
  export const delBBaddKReverseUnresolvedOrder: T.ChangeDoc = newChangeDoc(delBBaddK.moveChanges, reverseOrder.universalPropChanges, {universalProps: Order.con_you_reverse_they_delBB_addK}, true);

  // Used for live testing, not automated tests, can change
  export const testChangeList: T.ChangeDoc = {
    updateDescription: "test",
    createdAt: new Date().toString(),
    createdBy: "testyman",
    baseRevision: "",
    previousChange: "0-bonono?",
    universalPropChanges: {
      moveOrder: {type: "modify", 
        new: [{"name":"windy moves","isCategory":true},{"name":"AA"},{"name":"dishonest moves","isCategory":true},{"name":"BB","indent":1}].reverse() as T.MoveOrder[],
        old: [{"name":"windy moves","isCategory":true},{"name":"AA"},{"name":"dishonest moves","isCategory":true},{"name":"BB","indent":69}]}
    },
    moveChanges: {
      "AA": { 
        "damage": {type: "modify", new: 70, old: 69},
        //"cupsize": {type: "add", new: "AAA"},
        "height": {type: "delete", old: "H"},
      }
    },
  }
}


// ------------------------ CHAR DOCS -----------------------
export namespace CharDocs {
  export const baseDoc: T.CharDocWithMeta = {
    _id: "character/talim",
    _rev: "2",
    updatedAt: new Date("Mon April 20 1969 16:20:00 GMT+0200 (CEST)").toString(),
    updatedBy: "admin",
    charName: "Talim",
    displayName: "Talim",
    changeHistory: ['c1','c2alt'],
    universalProps: {
      Age: 14,
      Bio: "Is a good girl",
      moveOrder: Order.baseOrder,
    },
    moves: {
      AA: Vals.dmgHeight as T.MoveCols,
      BB: Vals.dmgHeight3 as T.MoveCols,
    }
  }

  export const noBB = cloneDeep<T.CharDocWithMeta>(baseDoc);
  delete noBB.moves.BB;
  noBB.universalProps.moveOrder = Order.noBB;
}
