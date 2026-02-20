/**
 * Effect target type constants, key parsing, and key building for the FE2 effect system.
 * All 31 target types with fe2.* key prefixes.
 */

/* -------------------------------------------- */
/*  Target Type Constants                       */
/* -------------------------------------------- */

export const EFFECT_TARGET_TYPES = {
  skill: "skill",
  allSkills: "allSkills",
  attribute: "attribute",
  allAttributes: "allAttributes",
  attributeMax: "attributeMax",
  enduranceMax: "enduranceMax",
  equipmentMax: "equipmentMax",
  armour: "armour",
  armourZeroEnd: "armourZeroEnd",
  hitBonus: "hitBonus",
  enduranceDamage: "enduranceDamage",
  influenceMax: "influenceMax",
  resourcesMax: "resourcesMax",
  utilitiesMax: "utilitiesMax",
  gritReroll: "gritReroll",
  combatOrder: "combatOrder",
  defense: "defense",
  movement: "movement",
  acquisition: "acquisition",
  arcane: "arcane",
  untrainedSkill: "untrainedSkill",
  recovery: "recovery",
  shield: "shield",
  shieldRegen: "shieldRegen",
  cargoMax: "cargoMax",
  weaponSlotsMax: "weaponSlotsMax",
  resupplyMax: "resupplyMax",
  handsMax: "handsMax",
  weaponsMax: "weaponsMax",
  // NPC-specific
  npcAttribute: "npcAttribute",
  npcMobility: "npcMobility",
  npcBodies: "npcBodies",
  npcDurability: "npcDurability",
  // Attack-specific (stored only, applied in attack dialog later)
  attackTargetArmour: "attackTargetArmour",
  attackTargetArmourCrit: "attackTargetArmourCrit",
  attackTargetCover: "attackTargetCover",
  attackSelfCover: "attackSelfCover",
  // Skill category effects (apply to all skills of a category)
  allPrimarySkills: "allPrimarySkills",
  allPersonalCombatSkills: "allPersonalCombatSkills",
  allSpacecraftSkills: "allSpacecraftSkills",
  // Skill tool effects (stored only, applied in roll dialog later)
  skillToolbox: "skillToolbox",
  skillWorkshop: "skillWorkshop"
};

/* -------------------------------------------- */
/*  Category Groupings for UI Dropdowns         */
/* -------------------------------------------- */

export const EFFECT_CATEGORIES = {
  skills: {
    label: "FE2.Effects.Categories.Skills",
    types: [
      { type: EFFECT_TARGET_TYPES.skill, label: "FE2.Effects.TargetTypes.Skill", hasSubtype: true },
      { type: EFFECT_TARGET_TYPES.untrainedSkill, label: "FE2.Effects.TargetTypes.UntrainedSkill" },
      { type: EFFECT_TARGET_TYPES.skillToolbox, label: "FE2.Effects.TargetTypes.SkillToolbox", hasSubtype: true },
      { type: EFFECT_TARGET_TYPES.skillWorkshop, label: "FE2.Effects.TargetTypes.SkillWorkshop", hasSubtype: true },
      { type: EFFECT_TARGET_TYPES.allPrimarySkills, label: "FE2.Effects.TargetTypes.AllPrimarySkills" },
      { type: EFFECT_TARGET_TYPES.allPersonalCombatSkills, label: "FE2.Effects.TargetTypes.AllPersonalCombatSkills" },
      { type: EFFECT_TARGET_TYPES.allSpacecraftSkills, label: "FE2.Effects.TargetTypes.AllSpacecraftSkills" }
    ]
  },
  attributes: {
    label: "FE2.Effects.Categories.Attributes",
    types: [
      { type: EFFECT_TARGET_TYPES.attribute, label: "FE2.Effects.TargetTypes.Attribute", hasSubtype: true },
      { type: EFFECT_TARGET_TYPES.allAttributes, label: "FE2.Effects.TargetTypes.AllAttributes" },
      { type: EFFECT_TARGET_TYPES.attributeMax, label: "FE2.Effects.TargetTypes.AttributeMax", hasSubtype: true }
    ]
  },
  combat: {
    label: "FE2.Effects.Categories.Combat",
    types: [
      { type: EFFECT_TARGET_TYPES.defense, label: "FE2.Effects.TargetTypes.Defense" },
      { type: EFFECT_TARGET_TYPES.armour, label: "FE2.Effects.TargetTypes.Armour" },
      { type: EFFECT_TARGET_TYPES.armourZeroEnd, label: "FE2.Effects.TargetTypes.ArmourZeroEnd" },
      { type: EFFECT_TARGET_TYPES.hitBonus, label: "FE2.Effects.TargetTypes.HitBonus" },
      { type: EFFECT_TARGET_TYPES.enduranceDamage, label: "FE2.Effects.TargetTypes.EnduranceDamage" },
      { type: EFFECT_TARGET_TYPES.combatOrder, label: "FE2.Effects.TargetTypes.CombatOrder" },
      { type: EFFECT_TARGET_TYPES.movement, label: "FE2.Effects.TargetTypes.Movement" },
      { type: EFFECT_TARGET_TYPES.gritReroll, label: "FE2.Effects.TargetTypes.GritReroll" }
    ]
  },
  resources: {
    label: "FE2.Effects.Categories.Resources",
    types: [
      { type: EFFECT_TARGET_TYPES.enduranceMax, label: "FE2.Effects.TargetTypes.EnduranceMax" },
      { type: EFFECT_TARGET_TYPES.equipmentMax, label: "FE2.Effects.TargetTypes.EquipmentMax" },
      { type: EFFECT_TARGET_TYPES.influenceMax, label: "FE2.Effects.TargetTypes.InfluenceMax" },
      { type: EFFECT_TARGET_TYPES.resourcesMax, label: "FE2.Effects.TargetTypes.ResourcesMax" },
      { type: EFFECT_TARGET_TYPES.utilitiesMax, label: "FE2.Effects.TargetTypes.UtilitiesMax" },
      { type: EFFECT_TARGET_TYPES.recovery, label: "FE2.Effects.TargetTypes.Recovery" },
      { type: EFFECT_TARGET_TYPES.acquisition, label: "FE2.Effects.TargetTypes.Acquisition" },
      { type: EFFECT_TARGET_TYPES.arcane, label: "FE2.Effects.TargetTypes.Arcane" },
      { type: EFFECT_TARGET_TYPES.handsMax, label: "FE2.Effects.TargetTypes.HandsMax" },
      { type: EFFECT_TARGET_TYPES.weaponsMax, label: "FE2.Effects.TargetTypes.WeaponsMax" }
    ]
  },
  spacecraft: {
    label: "FE2.Effects.Categories.Spacecraft",
    types: [
      { type: EFFECT_TARGET_TYPES.shield, label: "FE2.Effects.TargetTypes.Shield" },
      { type: EFFECT_TARGET_TYPES.shieldRegen, label: "FE2.Effects.TargetTypes.ShieldRegen" },
      { type: EFFECT_TARGET_TYPES.cargoMax, label: "FE2.Effects.TargetTypes.CargoMax" },
      { type: EFFECT_TARGET_TYPES.weaponSlotsMax, label: "FE2.Effects.TargetTypes.WeaponSlotsMax" },
      { type: EFFECT_TARGET_TYPES.resupplyMax, label: "FE2.Effects.TargetTypes.ResupplyMax" }
    ]
  },
  npc: {
    label: "FE2.Effects.Categories.NPC",
    types: [
      { type: EFFECT_TARGET_TYPES.npcAttribute, label: "FE2.Effects.TargetTypes.NPCAttribute" },
      { type: EFFECT_TARGET_TYPES.npcMobility, label: "FE2.Effects.TargetTypes.NPCMobility" },
      { type: EFFECT_TARGET_TYPES.npcBodies, label: "FE2.Effects.TargetTypes.NPCBodies" },
      { type: EFFECT_TARGET_TYPES.npcDurability, label: "FE2.Effects.TargetTypes.NPCDurability" }
    ]
  },
  attack: {
    label: "FE2.Effects.Categories.Attack",
    types: [
      { type: EFFECT_TARGET_TYPES.attackTargetArmour, label: "FE2.Effects.TargetTypes.AttackTargetArmour" },
      { type: EFFECT_TARGET_TYPES.attackTargetArmourCrit, label: "FE2.Effects.TargetTypes.AttackTargetArmourCrit" },
      { type: EFFECT_TARGET_TYPES.attackTargetCover, label: "FE2.Effects.TargetTypes.AttackTargetCover" },
      { type: EFFECT_TARGET_TYPES.attackSelfCover, label: "FE2.Effects.TargetTypes.AttackSelfCover" }
    ]
  }
};

/* -------------------------------------------- */
/*  Key-to-TargetType Mapping                   */
/* -------------------------------------------- */

const KEY_MAP = {
  "fe2.skill.all": { targetType: EFFECT_TARGET_TYPES.allSkills, targetId: null },
  "fe2.attribute.all": { targetType: EFFECT_TARGET_TYPES.allAttributes, targetId: null },
  "fe2.endurance.max": { targetType: EFFECT_TARGET_TYPES.enduranceMax, targetId: null },
  "fe2.equipment.max": { targetType: EFFECT_TARGET_TYPES.equipmentMax, targetId: null },
  "fe2.armour": { targetType: EFFECT_TARGET_TYPES.armour, targetId: null },
  "fe2.armourzeroend": { targetType: EFFECT_TARGET_TYPES.armourZeroEnd, targetId: null },
  "fe2.hitbonus": { targetType: EFFECT_TARGET_TYPES.hitBonus, targetId: null },
  "fe2.endurancedamage": { targetType: EFFECT_TARGET_TYPES.enduranceDamage, targetId: null },
  "fe2.influence.max": { targetType: EFFECT_TARGET_TYPES.influenceMax, targetId: null },
  "fe2.resources.max": { targetType: EFFECT_TARGET_TYPES.resourcesMax, targetId: null },
  "fe2.utilities.max": { targetType: EFFECT_TARGET_TYPES.utilitiesMax, targetId: null },
  "fe2.gritreroll": { targetType: EFFECT_TARGET_TYPES.gritReroll, targetId: null },
  "fe2.combatorder": { targetType: EFFECT_TARGET_TYPES.combatOrder, targetId: null },
  "fe2.defense": { targetType: EFFECT_TARGET_TYPES.defense, targetId: null },
  "fe2.movement": { targetType: EFFECT_TARGET_TYPES.movement, targetId: null },
  "fe2.acquisition": { targetType: EFFECT_TARGET_TYPES.acquisition, targetId: null },
  "fe2.arcane": { targetType: EFFECT_TARGET_TYPES.arcane, targetId: null },
  "fe2.untrainedskill": { targetType: EFFECT_TARGET_TYPES.untrainedSkill, targetId: null },
  "fe2.recovery": { targetType: EFFECT_TARGET_TYPES.recovery, targetId: null },
  "fe2.shield": { targetType: EFFECT_TARGET_TYPES.shield, targetId: null },
  "fe2.shieldregen": { targetType: EFFECT_TARGET_TYPES.shieldRegen, targetId: null },
  "fe2.cargo.max": { targetType: EFFECT_TARGET_TYPES.cargoMax, targetId: null },
  "fe2.weaponslots.max": { targetType: EFFECT_TARGET_TYPES.weaponSlotsMax, targetId: null },
  "fe2.resupply.max": { targetType: EFFECT_TARGET_TYPES.resupplyMax, targetId: null },
  "fe2.hands.max": { targetType: EFFECT_TARGET_TYPES.handsMax, targetId: null },
  "fe2.weapons.max": { targetType: EFFECT_TARGET_TYPES.weaponsMax, targetId: null },
  // NPC
  "fe2.npc.attribute": { targetType: EFFECT_TARGET_TYPES.npcAttribute, targetId: null },
  "fe2.npc.mobility": { targetType: EFFECT_TARGET_TYPES.npcMobility, targetId: null },
  "fe2.npc.bodies": { targetType: EFFECT_TARGET_TYPES.npcBodies, targetId: null },
  "fe2.npc.durability": { targetType: EFFECT_TARGET_TYPES.npcDurability, targetId: null },
  // Skill categories
  "fe2.skill.primary.all": { targetType: EFFECT_TARGET_TYPES.allPrimarySkills, targetId: null },
  "fe2.skill.personalcombat.all": { targetType: EFFECT_TARGET_TYPES.allPersonalCombatSkills, targetId: null },
  "fe2.skill.spaceshipcombat.all": { targetType: EFFECT_TARGET_TYPES.allSpacecraftSkills, targetId: null },
  // Attack
  "fe2.attack.targetarmour": { targetType: EFFECT_TARGET_TYPES.attackTargetArmour, targetId: null },
  "fe2.attack.targetarmourcrit": { targetType: EFFECT_TARGET_TYPES.attackTargetArmourCrit, targetId: null },
  "fe2.attack.targetcover": { targetType: EFFECT_TARGET_TYPES.attackTargetCover, targetId: null },
  "fe2.attack.selfcover": { targetType: EFFECT_TARGET_TYPES.attackSelfCover, targetId: null }
};

/* -------------------------------------------- */
/*  Key Parser                                  */
/* -------------------------------------------- */

/**
 * Parse an fe2.* effect key into its target type and optional target ID.
 * @param {string} key - The effect change key (e.g., "fe2.skill.abc123")
 * @returns {{ targetType: string, targetId: string|null }|null}
 */
export function parseEffectKey(key) {
  if (!key || !key.startsWith("fe2.")) return null;

  // Check exact matches first
  const exact = KEY_MAP[key];
  if (exact) return { ...exact };

  // Check dynamic patterns: fe2.skill.<id>, fe2.attribute.<key>, fe2.attributemax.<key>
  const parts = key.split(".");
  if (parts.length === 3) {
    if (parts[1] === "skill") {
      return { targetType: EFFECT_TARGET_TYPES.skill, targetId: parts[2] };
    }
    if (parts[1] === "attribute") {
      return { targetType: EFFECT_TARGET_TYPES.attribute, targetId: parts[2] };
    }
    if (parts[1] === "attributemax") {
      return { targetType: EFFECT_TARGET_TYPES.attributeMax, targetId: parts[2] };
    }
  }

  // fe2.skill.toolbox.<skillId|all>, fe2.skill.workshop.<skillId|all>
  if (parts.length === 4 && parts[1] === "skill") {
    if (parts[2] === "toolbox") {
      return { targetType: EFFECT_TARGET_TYPES.skillToolbox, targetId: parts[3] };
    }
    if (parts[2] === "workshop") {
      return { targetType: EFFECT_TARGET_TYPES.skillWorkshop, targetId: parts[3] };
    }
  }

  return null;
}

/* -------------------------------------------- */
/*  Key Builder                                 */
/* -------------------------------------------- */

/**
 * Build an fe2.* effect key from a target type and optional target ID.
 * @param {string} targetType - One of EFFECT_TARGET_TYPES values
 * @param {string|null} targetId - Sub-identifier (skill ID, attribute key)
 * @returns {string}
 */
export function buildEffectKey(targetType, targetId) {
  switch (targetType) {
    case EFFECT_TARGET_TYPES.skill:
      return `fe2.skill.${targetId}`;
    case EFFECT_TARGET_TYPES.allSkills:
      return "fe2.skill.all";
    case EFFECT_TARGET_TYPES.attribute:
      return `fe2.attribute.${targetId}`;
    case EFFECT_TARGET_TYPES.allAttributes:
      return "fe2.attribute.all";
    case EFFECT_TARGET_TYPES.attributeMax:
      return `fe2.attributemax.${targetId}`;
    case EFFECT_TARGET_TYPES.enduranceMax:
      return "fe2.endurance.max";
    case EFFECT_TARGET_TYPES.equipmentMax:
      return "fe2.equipment.max";
    case EFFECT_TARGET_TYPES.armour:
      return "fe2.armour";
    case EFFECT_TARGET_TYPES.armourZeroEnd:
      return "fe2.armourzeroend";
    case EFFECT_TARGET_TYPES.hitBonus:
      return "fe2.hitbonus";
    case EFFECT_TARGET_TYPES.enduranceDamage:
      return "fe2.endurancedamage";
    case EFFECT_TARGET_TYPES.influenceMax:
      return "fe2.influence.max";
    case EFFECT_TARGET_TYPES.resourcesMax:
      return "fe2.resources.max";
    case EFFECT_TARGET_TYPES.utilitiesMax:
      return "fe2.utilities.max";
    case EFFECT_TARGET_TYPES.gritReroll:
      return "fe2.gritreroll";
    case EFFECT_TARGET_TYPES.combatOrder:
      return "fe2.combatorder";
    case EFFECT_TARGET_TYPES.defense:
      return "fe2.defense";
    case EFFECT_TARGET_TYPES.movement:
      return "fe2.movement";
    case EFFECT_TARGET_TYPES.acquisition:
      return "fe2.acquisition";
    case EFFECT_TARGET_TYPES.arcane:
      return "fe2.arcane";
    case EFFECT_TARGET_TYPES.untrainedSkill:
      return "fe2.untrainedskill";
    case EFFECT_TARGET_TYPES.recovery:
      return "fe2.recovery";
    case EFFECT_TARGET_TYPES.shield:
      return "fe2.shield";
    case EFFECT_TARGET_TYPES.shieldRegen:
      return "fe2.shieldregen";
    case EFFECT_TARGET_TYPES.cargoMax:
      return "fe2.cargo.max";
    case EFFECT_TARGET_TYPES.weaponSlotsMax:
      return "fe2.weaponslots.max";
    case EFFECT_TARGET_TYPES.resupplyMax:
      return "fe2.resupply.max";
    case EFFECT_TARGET_TYPES.handsMax:
      return "fe2.hands.max";
    case EFFECT_TARGET_TYPES.weaponsMax:
      return "fe2.weapons.max";
    // NPC
    case EFFECT_TARGET_TYPES.npcAttribute:
      return "fe2.npc.attribute";
    case EFFECT_TARGET_TYPES.npcMobility:
      return "fe2.npc.mobility";
    case EFFECT_TARGET_TYPES.npcBodies:
      return "fe2.npc.bodies";
    case EFFECT_TARGET_TYPES.npcDurability:
      return "fe2.npc.durability";
    // Attack
    case EFFECT_TARGET_TYPES.attackTargetArmour:
      return "fe2.attack.targetarmour";
    case EFFECT_TARGET_TYPES.attackTargetArmourCrit:
      return "fe2.attack.targetarmourcrit";
    case EFFECT_TARGET_TYPES.attackTargetCover:
      return "fe2.attack.targetcover";
    case EFFECT_TARGET_TYPES.attackSelfCover:
      return "fe2.attack.selfcover";
    // Skill categories
    case EFFECT_TARGET_TYPES.allPrimarySkills:
      return "fe2.skill.primary.all";
    case EFFECT_TARGET_TYPES.allPersonalCombatSkills:
      return "fe2.skill.personalcombat.all";
    case EFFECT_TARGET_TYPES.allSpacecraftSkills:
      return "fe2.skill.spaceshipcombat.all";
    // Skill tools
    case EFFECT_TARGET_TYPES.skillToolbox:
      return `fe2.skill.toolbox.${targetId || "all"}`;
    case EFFECT_TARGET_TYPES.skillWorkshop:
      return `fe2.skill.workshop.${targetId || "all"}`;
    default:
      return "";
  }
}

/* -------------------------------------------- */
/*  Character Attribute Keys                    */
/* -------------------------------------------- */

export const CHARACTER_ATTRIBUTES = ["strength", "reflexes", "mobility", "focus", "intelligence", "grit"];

export const SPACECRAFT_ATTRIBUTES = ["hull", "engines", "crew", "power", "cpu", "sensors", "velocity"];
