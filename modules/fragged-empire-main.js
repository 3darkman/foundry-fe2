/**
 * FraggedEmpire system
 * Author: Uberwald
 * Software License: Prop
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { FraggedEmpireActor } from "./fragged-empire-actor.js";
import { FraggedEmpireItemSheet } from "./fragged-empire-item-sheet.js";
import { FraggedEmpireActorSheet } from "./fragged-empire-actor-sheet.js";
import { FraggedEmpireSpacecraftSheet } from "./fragged-empire-spacecraft-sheet.js";
import { FraggedEmpireNPCSheet } from "./fragged-empire-npc-sheet.js";
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireCombat } from "./fragged-empire-combat.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/************************************************************************************/
Hooks.once("init", async function () {
  console.log(`Initializing Fragged Empire`);
  const compTables = await FraggedEmpireUtility.loadCompendium("foundry-fe2.fragged-empire-2-tables");

  game.settings.register("foundry-fe2", "systemMigrationVersion", {
      name: "System Migration Version",
      scope: "world",
      config: false,
      type: String,
      default: ""
  });

  /* -------------------------------------------- */
  // Custom Handlebars helper: resolve item type to localized label
  Handlebars.registerHelper("localizeType", function (type) {
    const key = CONFIG.Item.typeLabels?.[type];
    return key ? game.i18n.localize(key) : type;
  });

  /* -------------------------------------------- */
  // preload handlebars templates
  FraggedEmpireUtility.preloadHandlebarsTemplates();

  /* -------------------------------------------- */
  // Set an initiative formula for the system 
  CONFIG.Combat.initiative = {
    formula: "1d6",
    decimals: 1
  };

  /* -------------------------------------------- */
  game.socket.on("system.foundry-fe2", data => {
    FraggedEmpireUtility.onSocketMesssage(data);
  });

  /* -------------------------------------------- */
  // Define custom Entity classes
  CONFIG.Combat.documentClass = FraggedEmpireCombat;
  CONFIG.Actor.documentClass = FraggedEmpireActor;
  CONFIG.FraggedEmpire = {
  }

  /* -------------------------------------------- */
  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("foundry-fe2", FraggedEmpireActorSheet, { types: ["character"], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("foundry-fe2", FraggedEmpireSpacecraftSheet, { types: ["spacecraft"], makeDefault: false });
  foundry.documents.collections.Actors.registerSheet("foundry-fe2", FraggedEmpireNPCSheet, { types: ["npc"], makeDefault: false });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("foundry-fe2", FraggedEmpireItemSheet, { makeDefault: true });

  FraggedEmpireUtility.init();

  // Localize actor and item type names
  CONFIG.Actor.typeLabels = {
    "character": "FE2.ActorTypes.Character",
    "npc": "FE2.ActorTypes.NPC",
    "spacecraft": "FE2.ActorTypes.Spacecraft"
  };
  CONFIG.Item.typeLabels = {
    "weapon": "FE2.Items.Types.Weapon",
    "skill": "FE2.Items.Types.Skill",
    "trait": "FE2.Items.Types.Trait",
    "outfit": "FE2.Items.Types.Outfit",
    "equipment": "FE2.Items.Types.Equipment",
    "perk": "FE2.Items.Types.Perk",
    "complication": "FE2.Items.Types.Complication",
    "race": "FE2.Items.Types.Race",
    "language": "FE2.Items.Types.Language",
    "utility": "FE2.Items.Types.Utility",
    "tradegood": "FE2.Items.Types.TradeGood",
    "research": "FE2.Items.Types.Research",
    "modification": "FE2.Items.Types.Modification",
    "variation": "FE2.Items.Types.Variation",
    "stronghit": "FE2.Items.Types.StrongHit",
    "spacecraftperk": "FE2.Items.Types.SpacecraftPerk",
    "spacecrafttrait": "FE2.Items.Types.SpacecraftTrait",
    "spacecraftweapon": "FE2.Items.Types.SpacecraftWeapon",
    "spacecraftweaponmodification": "FE2.Items.Types.SpacecraftWeaponMod",
    "spacecraftweaponvariation": "FE2.Items.Types.SpacecraftWeaponVar",
    "variationoutfit": "FE2.Items.Types.VariationOutfit",
    "modificationoutfit": "FE2.Items.Types.ModificationOutfit"
  };

});

/* -------------------------------------------- */
function welcomeMessage() {
  ChatMessage.create({
    user: game.user.id,
    whisper: [game.user.id],
    content: `<div id="welcome-message-fragged-empire"><span class="rdd-roll-part">${game.i18n.localize("FE2.Chat.Results.Welcome")}</div>
    ` });
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("ready", async function () {

  FraggedEmpireUtility.ready();

  // User warning
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info(game.i18n.localize("FE2.Notifications.NoLinkedCharacter"));
    ChatMessage.create({
      content: game.i18n.format("FE2.Notifications.NoLinkedCharacterChat", {name: game.user.name}),
      user: game.user._id
    });
  }

  if (foundry.utils.isNewerVersion("1.01", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    for (let actor of game.actors) {
      try {
        if (actor.type == 'character') {
          let updateData = foundry.utils.deepClone(actor.toObject());
          updateData.system.attributes.mobility = updateData.system.attributes.movement;
          if (!foundry.utils.isEmpty(updateData)) {
            await actor.update(updateData, { enforceTypes: false });
            await actor.update({'system.attributes.-=movement':null})
          }
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  if (foundry.utils.isNewerVersion("1.02", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    for (let actor of game.actors) {
      try {
        if (actor.type == 'spacecraft') {
          let updateData = foundry.utils.deepClone(actor.toObject());
          updateData.system.fight.gritreroll.label = "Grit re-rolls";
          updateData.system.fight.gritreroll.valueonly = true;
          updateData.system.fight.gritreroll.value = 0;
          if (!foundry.utils.isEmpty(updateData)) {
            await actor.update(updateData, { enforceTypes: false });
          }
        }
        if (actor.type == 'character'){
          let updateData = foundry.utils.deepClone(actor.toObject());
          updateData.system.combatordermod = 0;
          if (!foundry.utils.isEmpty(updateData)) {
            await actor.update(updateData, { enforceTypes: false });
          }
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  // Migration 1.03: Replace hardcoded English labels with i18n keys
  if (foundry.utils.isNewerVersion("1.03", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    const labelAlreadyI18n = (v) => typeof v === "string" && v.startsWith("FE2.");

    // Actor attribute label maps
    const charAttrMap = { "Strength": "FE2.Attributes.Strength", "Reflexes": "FE2.Attributes.Reflexes", "Mobility": "FE2.Attributes.Mobility", "Focus": "FE2.Attributes.Focus", "Intelligence": "FE2.Attributes.Intelligence", "Grit": "FE2.Attributes.Grit" };
    const scAttrMap = { "Hull": "FE2.SpacecraftAttr.Hull", "Engines": "FE2.SpacecraftAttr.Engines", "Crew": "FE2.SpacecraftAttr.Crew", "Power": "FE2.SpacecraftAttr.Power", "CPU": "FE2.SpacecraftAttr.CPU", "Sensors": "FE2.SpacecraftAttr.Sensors", "Velocity": "FE2.SpacecraftAttr.Velocity" };
    const scStatsMap = { "Cargo": "FE2.Sheet.Spacecraft.Cargo", "Secret Cargo": "FE2.Sheet.Spacecraft.SecretCargo", "Weapons slot": "FE2.Sheet.Spacecraft.WeaponsSlot", "Resupply": "FE2.Sheet.Spacecraft.Resupply" };
    const scFightMap = { "Defence": "FE2.Fight.Spacecraft.Defence", "Armour": "FE2.Fight.Spacecraft.Armour", "Munitions": "FE2.Fight.Spacecraft.Munitions", "Grit re-rolls": "FE2.Fight.Spacecraft.GritRerolls", "Boarded": "FE2.Fight.Spacecraft.Boarded", "Launched Bodies": "FE2.Fight.Spacecraft.LaunchedBodies", "Bodies": "FE2.Fight.Spacecraft.Bodies", "Shield": "FE2.Fight.Spacecraft.Shield" };
    const scFightDerivMap = { "Vs Ordinance": "FE2.Fight.Spacecraft.VsOrdinance", "Vs Boarding": "FE2.Fight.Spacecraft.VsBoarding", "At 0 Shield": "FE2.Fight.Spacecraft.At0Shield", "Regen": "FE2.Fight.Spacecraft.Regen" };
    const npcFightMap = { "Endurance": "FE2.Fight.NPC.Endurance", "Durability": "FE2.Fight.NPC.Durability", "Movement": "FE2.Fight.NPC.Movement", "Armour": "FE2.Fight.NPC.Armour", "Defence": "FE2.Fight.NPC.Defence" };
    const npcDerivMap = { "vs Stealth": "FE2.Fight.NPC.VsStealth", "vs Impair": "FE2.Fight.NPC.VsImpair" };
    const npcSpecMap = { "Bodies": "FE2.Fight.NPC.Bodies", "Average Player Resource": "FE2.Fight.NPC.AveragePlayerResource" };

    // Item stat label maps
    const weaponStatsMap = { "Hit Dice": "FE2.Stats.Weapon.HitDice", "Hit Bonus": "FE2.Stats.Weapon.HitBonus", "Endurance Damage": "FE2.Stats.Weapon.EnduranceDamage", "Critical Damage": "FE2.Stats.Weapon.CriticalDamage", "Range Increment": "FE2.Stats.Weapon.RangeIncrement", "Acquire": "FE2.Stats.Weapon.Acquire", "Resources": "FE2.Stats.Weapon.Resources" };
    const outfitStatsMap = { "Defence": "FE2.Stats.Outfit.Defence", "Endurance": "FE2.Stats.Outfit.Endurance", "Armour": "FE2.Stats.Outfit.Armour", "At 0 Endurance": "FE2.Stats.Outfit.AtZeroEndurance", "Outfit Type": "FE2.Stats.Outfit.OutfitType", "Cost": "FE2.Stats.Outfit.Cost", "Cover": "FE2.Stats.Outfit.Cover", "Front Cover": "FE2.Stats.Outfit.FrontCover", "Equipped Equipment Slots": "FE2.Stats.Outfit.EquippedEquipmentSlots", "Weight": "FE2.Stats.Outfit.Weight" };
    const scWeaponStatsMap = { "Hit Dice": "FE2.Stats.Spacecraft.HitDice", "Hit Bonus": "FE2.Stats.Spacecraft.HitBonus", "Range Increment": "FE2.Stats.Spacecraft.RangeIncrement", "Shield Damage": "FE2.Stats.Spacecraft.ShieldDamage", "Critical Damage": "FE2.Stats.Spacecraft.CriticalDamage", "Mount": "FE2.Stats.Spacecraft.Mount", "Weapon Type": "FE2.Stats.Spacecraft.WeaponType", "Acquire": "FE2.Stats.Spacecraft.Acquire", "Influence": "FE2.Stats.Spacecraft.Influence" };

    // Item keyword label maps
    const weaponKwMap = { "Arc of Fire": "FE2.Keywords.Weapon.ArcOfFire", "Attribute 1d3": "FE2.Keywords.Weapon.Attribute1d3", "Bio Tech": "FE2.Keywords.Weapon.BioTech", "Blunt": "FE2.Keywords.Weapon.Blunt", "Burn": "FE2.Keywords.Weapon.Burn", "Cost Spare TP": "FE2.Keywords.Weapon.CostSpareTP", "Electro-Gravity": "FE2.Keywords.Weapon.ElectroGravity", "Energy": "FE2.Keywords.Weapon.Energy", "For 1 Session Only": "FE2.Keywords.Weapon.For1SessionOnly", "Gauntlet": "FE2.Keywords.Weapon.Gauntlet", "Innate": "FE2.Keywords.Weapon.Innate", "Jam": "FE2.Keywords.Weapon.Jam", "Lock On": "FE2.Keywords.Weapon.LockOn", "Lose": "FE2.Keywords.Weapon.Lose", "Low Tech": "FE2.Keywords.Weapon.LowTech", "Mod. Rolls": "FE2.Keywords.Weapon.ModRolls", "Natural": "FE2.Keywords.Weapon.Natural", "No Var. or Mod.": "FE2.Keywords.Weapon.NoVarOrMod", "Optional": "FE2.Keywords.Weapon.Optional", "Only": "FE2.Keywords.Weapon.Only", "Pen": "FE2.Keywords.Weapon.Pen", "Prototype": "FE2.Keywords.Weapon.Prototype", "Requires": "FE2.Keywords.Weapon.Requires", "Robot": "FE2.Keywords.Weapon.Robot", "Setup ": "FE2.Keywords.Weapon.Setup", "Slow": "FE2.Keywords.Weapon.Slow", "Small": "FE2.Keywords.Weapon.Small", "Splash": "FE2.Keywords.Weapon.Splash", "Stealth": "FE2.Keywords.Weapon.Stealth", "Strong Hit": "FE2.Keywords.Weapon.StrongHit", "Works in Liquid": "FE2.Keywords.Weapon.WorksInLiquid", "Not in the void": "FE2.Keywords.Weapon.NotInTheVoid" };
    const weaponKwYMap = { "Min": "FE2.Keywords.Weapon.Min", "Pull Down": "FE2.Keywords.Weapon.PullDown", "-": "FE2.Keywords.Weapon.Dash" };
    const scWeaponKwMap = { "Cost Spare Time Point": "FE2.Keywords.SpacecraftWeapon.CostSpareTimePoint", "For One Session Only": "FE2.Keywords.SpacecraftWeapon.ForOneSessionOnly", "Modification Rolls": "FE2.Keywords.SpacecraftWeapon.ModificationRolls", "No Variation or Modifications": "FE2.Keywords.SpacecraftWeapon.NoVarOrMod", "Does not work in the void": "FE2.Keywords.SpacecraftWeapon.NotInTheVoid" };
    const outfitKwMap = { "Bio Tech": "FE2.Keywords.Outfit.BioTech", "Communications Short": "FE2.Keywords.Outfit.CommunicationsShort", "Communications Long": "FE2.Keywords.Outfit.CommunicationsLong", "Cost Spare Time Point": "FE2.Keywords.Outfit.CostSpareTimePoint", "Environmental Gear": "FE2.Keywords.Outfit.EnvironmentalGear", "Flight": "FE2.Keywords.Outfit.Flight", "Gauntlet": "FE2.Keywords.Outfit.Gauntlet", "Innate": "FE2.Keywords.Outfit.Innate", "Modification Rolls": "FE2.Keywords.Outfit.ModificationRolls", "Set Up, Pull Down": "FE2.Keywords.Outfit.SetUpPullDown", "Shield": "FE2.Keywords.Outfit.Shield" };

    // Helper to migrate labels in a flat object of {key: {label, ...}}
    function migrateLabels(obj, map, updates, prefix) {
      if (!obj) return;
      for (let key in obj) {
        if (obj[key]?.label && !labelAlreadyI18n(obj[key].label) && map[obj[key].label]) {
          updates[`${prefix}.${key}.label`] = map[obj[key].label];
        }
        if (obj[key]?.labelY && !labelAlreadyI18n(obj[key].labelY) && weaponKwYMap[obj[key].labelY]) {
          updates[`${prefix}.${key}.labelY`] = weaponKwYMap[obj[key].labelY];
        }
      }
    }

    // Helper to migrate derivated sub-labels
    function migrateDerivated(obj, map, updates, prefix) {
      if (!obj?.derivated) return;
      for (let key in obj.derivated) {
        if (obj.derivated[key]?.label && !labelAlreadyI18n(obj.derivated[key].label) && map[obj.derivated[key].label]) {
          updates[`${prefix}.derivated.${key}.label`] = map[obj.derivated[key].label];
        }
      }
    }

    // Migrate actors
    for (let actor of game.actors) {
      try {
        let updates = {};
        if (actor.type === "character") {
          migrateLabels(actor.system.attributes, charAttrMap, updates, "system.attributes");
        } else if (actor.type === "spacecraft") {
          migrateLabels(actor.system.attributes, scAttrMap, updates, "system.attributes");
          migrateLabels(actor.system.stats, scStatsMap, updates, "system.stats");
          if (actor.system.size?.label && !labelAlreadyI18n(actor.system.size.label)) {
            updates["system.size.label"] = "FE2.Sheet.Spacecraft.Size";
          }
          for (let fKey in actor.system.fight) {
            let fStat = actor.system.fight[fKey];
            if (fStat?.label && !labelAlreadyI18n(fStat.label) && scFightMap[fStat.label]) {
              updates[`system.fight.${fKey}.label`] = scFightMap[fStat.label];
            }
            migrateDerivated(fStat, scFightDerivMap, updates, `system.fight.${fKey}`);
          }
        } else if (actor.type === "npc") {
          for (let fKey in actor.system.fight) {
            let fStat = actor.system.fight[fKey];
            if (fStat?.label && !labelAlreadyI18n(fStat.label) && npcFightMap[fStat.label]) {
              updates[`system.fight.${fKey}.label`] = npcFightMap[fStat.label];
            }
            migrateDerivated(fStat, npcDerivMap, updates, `system.fight.${fKey}`);
          }
          migrateLabels(actor.system.spec, npcSpecMap, updates, "system.spec");
          if (actor.system.stats?.Attribute?.label && !labelAlreadyI18n(actor.system.stats.Attribute.label)) {
            updates["system.stats.Attribute.label"] = "FE2.Sheet.NPC.Attribute";
          }
        }
        if (Object.keys(updates).length > 0) {
          await actor.update(updates);
        }
      } catch (error) {
        error.message = `Failed i18n migration for Actor ${actor.name}: ${error.message}`;
        console.error(error);
      }
    }

    // Migrate items (both world items and embedded items on actors)
    const allItems = [...game.items];
    for (let actor of game.actors) {
      for (let item of actor.items) {
        allItems.push(item);
      }
    }
    for (let item of allItems) {
      try {
        let updates = {};
        const t = item.type;
        // Weapon stats
        if (["weapon", "modification", "variation"].includes(t)) {
          migrateLabels(item.system.stats, weaponStatsMap, updates, "system.stats");
          if (item.system.statstotal) migrateLabels(item.system.statstotal, weaponStatsMap, updates, "system.statstotal");
        }
        // Weapon keywords
        if (t === "weapon") {
          migrateLabels(item.system.keywords, { ...weaponKwMap }, updates, "system.keywords");
        }
        // Outfit/utility stats
        if (["outfit", "variationoutfit", "modificationoutfit", "utility"].includes(t)) {
          migrateLabels(item.system.stats, outfitStatsMap, updates, "system.stats");
          if (item.system.statstotal) migrateLabels(item.system.statstotal, outfitStatsMap, updates, "system.statstotal");
        }
        // Outfit/utility keywords
        if (["outfit", "utility"].includes(t)) {
          migrateLabels(item.system.keywords, outfitKwMap, updates, "system.keywords");
        }
        // Spacecraft weapon stats
        if (["spacecraftweapon", "spacecraftweaponmodification", "spacecraftweaponvariation"].includes(t)) {
          migrateLabels(item.system.stats, scWeaponStatsMap, updates, "system.stats");
          if (item.system.statstotal) migrateLabels(item.system.statstotal, scWeaponStatsMap, updates, "system.statstotal");
        }
        // Spacecraft weapon keywords (merge both maps)
        if (t === "spacecraftweapon") {
          migrateLabels(item.system.keywords, { ...weaponKwMap, ...scWeaponKwMap }, updates, "system.keywords");
        }
        if (Object.keys(updates).length > 0) {
          await item.update(updates);
        }
      } catch (error) {
        error.message = `Failed i18n migration for Item ${item.name}: ${error.message}`;
        console.error(error);
      }
    }
  }

  await game.settings.set("foundry-fe2", "systemMigrationVersion", game.system.version);
  ui.notifications.notify(game.i18n.localize("FE2.Notifications.MigrationComplete"));

  welcomeMessage();
});

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] == '/') {
    let regExp = /(\S+)/g;
    let commands = content.toLowerCase().match(regExp);
    console.log(commands);
  }
  return true;
});

Hooks.on("combatRound", (combat, prior, current) => {

  // Notify you that the hook ran
  ui.notifications.info(game.i18n.format("FE2.Combat.NewRound", {round: combat.round}));
  if (combat.combatant?.actor.type == 'spacecraft') {
    console.log("This is a spaceship fight, rerolling alternate initiative")
  }
  combat.turns.forEach((theGuy) => {
    combat.rollInitiative(theGuy.id);
  })
});

Hooks.on("renderChatMessage", async (message, html, data) => {
  const fe2Flags = message.flags?.["foundry-fe2"];
  if (!fe2Flags) return;

  const el = html instanceof HTMLElement ? html : html[0];
  const messageContent = el?.querySelector(".message-content");
  if (!messageContent) return;

  if (fe2Flags.rollData) {
    const rendered = await foundry.applications.handlebars.renderTemplate(
      "systems/foundry-fe2/templates/chat-generic-result.html",
      fe2Flags.rollData
    );
    messageContent.innerHTML = rendered;
  } else if (fe2Flags.itemData) {
    const rendered = await foundry.applications.handlebars.renderTemplate(
      "systems/foundry-fe2/templates/post-item.html",
      fe2Flags.itemData
    );
    messageContent.innerHTML = rendered;
  }
});

Hooks.on("modifyTokenAttribute", (data, updates, actor) => {
  // Notify you that the hook ran
  console.log("modifyTokenAttribute fired!",data,updates,actor)
  if (data.attribute == "fight.endurance.value" && actor.type == "npc" && actor.system.npctype == "henchman") {
    canvas.scene.tokens.forEach((st) => {
      if (st.name == actor.name && st.id != actor.parent.id) {
        console.log("We need to update endurance on",st.actor)
        st.actor.system.fight.endurance.value = data.value
      }
    })
  }
});
