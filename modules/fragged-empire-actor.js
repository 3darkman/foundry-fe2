/* -------------------------------------------- */
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireRoll } from "./fragged-empire-roll-dialog.js";
import { createEmptyModifiers, addModifier, applyModifiers, isEquipSuppressed } from "./effects/fragged-empire-effect-helpers.js";
import { parseEffectKey, CHARACTER_ATTRIBUTES, SPACECRAFT_ATTRIBUTES } from "./effects/fragged-empire-effect-types.js";
import { computeEffectiveItemStats, findKeywordOnItem } from "./keyword-config.js";

/* -------------------------------------------- */
const coverBonusTable = { "nocover": 0, "lightcover": 1, "heavycover": 2, "entrenchedcover": 3};

/* -------------------------------------------- */
/* -------------------------------------------- */
/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class FraggedEmpireActor extends Actor {

  static defineSchema() {

    const fields = foundry.data.fields;
    return {
      level: new fields.NumberField({ initial: 1 }),
      resources: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        alloted: new fields.NumberField({ initial: 0 }),
        bonus: new fields.NumberField({ initial: 0 }),
        total: new fields.NumberField({ initial: 0 })
      }),
      influence: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        bonus: new fields.NumberField({ initial: 0 }),
        total: new fields.NumberField({ initial: 0 })
      }),
      sparetimepoints: new fields.NumberField({ initial: 1 }),
      attributes: new fields.SchemaField({
        strength: new fields.SchemaField({
          label: new fields.StringField({ initial: "Strength" }),
          value: new fields.NumberField({ initial: 0 }),
          current: new fields.NumberField({ initial: 0 })
        }),
      })
    }
  }

  /* -------------------------------------------- */
  /**
   * Override the create() function to provide additional SoS functionality.
   *
   * This overrided create() function adds initial items 
   * Namely: Basic skills, money, 
   *
   * @param {Object} data        Barebones actor data which this function adds onto.
   * @param {Object} options     (Unused) Additional options which customize the creation workflow.
   *
   */

  static async create(data, options) {

    // Case of compendium global import
    if (data instanceof Array) {
      return super.create(data, options);
    }
    // If the created actor has items (only applicable to duplicated actors) bypass the new actor creation logic
    if (data.items) {
      let actor = super.create(data, options);
      return actor;
    }

    if ( data.type == 'character') {
      const skills = await FraggedEmpireUtility.loadCompendium(FraggedEmpireUtility.getSkillsCompendiumName());
      data.items = skills.map(i => i.toObject());
    }

    return super.create(data, options);
  }
    
  /* -------------------------------------------- */
  prepareBaseData() {
  }

  /* -------------------------------------------- */
  /**
   * Override applyActiveEffects to collect structured modifiers from fe2.* keys.
   * Populates this._effectModifiers for consumption in prepareDerivedData() and rolls.
   */
  applyActiveEffects() {
    this._effectModifiers = createEmptyModifiers();
    for (const effect of this.effects) {
      if (effect.disabled) continue;
      if (isEquipSuppressed(effect, this)) continue;
      for (const change of effect.changes) {
        const parsed = parseEffectKey(change.key);
        if (!parsed) continue;
        addModifier(this._effectModifiers, parsed, change, effect.name, effect.id);
      }
    }
  }

  /* -------------------------------------------- */
  async prepareData() {
    
    super.prepareData();
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    const mods = this._effectModifiers;
    this._baseValues = {};
    this._computed = {};

    if (this.type == 'character') {
      this._prepareCharacterDerived(mods);
    }
    if (this.type == 'spacecraft') {
      this._prepareSpacecraftDerived(mods);
    }
    if (this.type == 'npc') {
      this._prepareNPCDerived(mods);
    }

    super.prepareDerivedData();
  }

  /* -------------------------------------------- */
  /**
   * Compute effective attribute values with effect modifiers applied.
   * Does NOT modify system data; returns a separate object for use in formulas.
   * @param {string[]} attrKeys - Array of attribute key names
   * @param {object|null} mods - Effect modifiers map
   * @param {object} defaultMaxes - Default attribute max values (e.g., {strength: 5})
   * @returns {object} Map of key -> { value, current, max }
   */
  _computeEffectiveAttributes(attrKeys, mods, defaultMaxes) {
    const effective = {};
    for (const key of attrKeys) {
      const attr = this.system.attributes[key];
      if (!attr) continue;
      const baseMax = defaultMaxes[key] ?? 5;
      const effectiveMax = mods ? Math.round(applyModifiers(baseMax, mods.attributeMax[key] || [])) : baseMax;
      const attrMods = mods ? [...(mods.attributes[key] || []), ...(mods.attributes.all || [])] : [];
      effective[key] = {
        value: attrMods.length ? Math.min(Math.round(applyModifiers(attr.value, attrMods)), effectiveMax) : attr.value,
        current: attrMods.length ? Math.min(Math.round(applyModifiers(attr.current, attrMods)), effectiveMax) : attr.current,
        max: effectiveMax
      };
    }
    return effective;
  }

  /* -------------------------------------------- */
  _prepareCharacterDerived(mods) {
    // Compute effective attributes (not persisted, avoids form-binding compound bug)
    const defaultMaxes = this.system.attributemax || {};
    this._baseValues.attributeMaxes = { ...defaultMaxes };
    this._effectiveAttributes = this._computeEffectiveAttributes(CHARACTER_ATTRIBUTES, mods, defaultMaxes);
    const ea = this._effectiveAttributes;

    // Resources total
    let restotal = this.system.level.value + 3;
    this._baseValues.resourcesTotal = restotal;
    if (mods) restotal = Math.round(applyModifiers(restotal, mods.resourcesMax));
    if (restotal != this.system.resources.total) {
      this.system.resources.total = restotal;
      this.update({ 'system.resources.total': restotal });
    }

    // Resources allotted (sum from embedded equipment) and current (max - allotted)
    this._computed.resourcesAllotted = this.getResourcesAllotted();
    this._computed.resourcesCurrent = restotal - this._computed.resourcesAllotted;

    // Influence total
    let inftotal = this.system.level.value + 3;
    this._baseValues.influenceTotal = inftotal;
    if (mods) inftotal = Math.round(applyModifiers(inftotal, mods.influenceMax));
    if (inftotal != this.system.influence.total) {
      this.system.influence.total = inftotal;
      this.update({ 'system.influence.total': inftotal });
    }

    // Endurance max (uses effective strength)
    let endmax = 10 + (ea.strength.value * 5);
    this._baseValues.enduranceMax = endmax;
    if (mods) endmax = Math.round(applyModifiers(endmax, mods.enduranceMax));
    if (endmax != this.system.endurance.max) {
      this.system.endurance.max = endmax;
      this.update({ 'system.endurance.max': endmax });
    }

    // Defense total (uses effective reflexes, intelligence)
    let coverBonus = coverBonusTable[this.system.defensebonus.cover] * ea.intelligence.current;
    let outfitDefBonus = 0;
    let outfits = this.items.filter(item => (item.type === 'outfit' || item.type === 'utility') && item.system.carryState !== "carried");
    for (let item of outfits) {
      if (!isNaN(item.system.statstotal?.defence?.value)) {
        outfitDefBonus += Number(item.system.statstotal.defence.value);
      }
    }
    let defBase = 10 + ea.reflexes.value + outfitDefBonus;
    let defTotal = defBase + coverBonus;
    this._baseValues.defenseTotal = defTotal;
    if (mods) defTotal = Math.round(applyModifiers(defTotal, mods.defense));
    if (defTotal != this.system.defensebonus.total) {
      this.system.defensebonus.total = defTotal;
      this.update({ 'system.defensebonus.total': defTotal });
    }

    // Recovery (uses effective grit)
    let recovery = ea.grit.value;
    this._baseValues.recovery = recovery;
    if (mods) recovery = Math.round(applyModifiers(recovery, mods.recovery));
    if (recovery != this.system.endurance.recovery) {
      this.system.endurance.recovery = recovery;
      this.update({ 'system.endurance.recovery': recovery });
    }

    // Grit rerolls (uses effective grit)
    let gritreroll = ea.grit.value;
    this._baseValues.gritRerollMax = gritreroll;
    if (mods) gritreroll = Math.round(applyModifiers(gritreroll, mods.gritReroll));
    if (gritreroll != this.system.gritreroll.max) {
      this.system.gritreroll.max = gritreroll;
      this.update({ 'system.gritreroll.max': gritreroll });
    }

    // Computed modifier values (not persisted, for rolls and display — base is 0, only effects contribute)
    this._computed.hitBonus = mods ? Math.round(applyModifiers(0, mods.hitBonus)) : 0;
    this._computed.enduranceDamage = mods ? Math.round(applyModifiers(0, mods.enduranceDamage)) : 0;
    this._computed.utilitiesMax = mods ? Math.round(applyModifiers(1, mods.utilitiesMax)) : 1;
    this._baseValues.movementBase = ea.mobility.value;
    this._computed.movement = mods ? Math.round(applyModifiers(ea.mobility.value, mods.movement)) : ea.mobility.value;
    this._computed.acquisitionMod = mods ? Math.round(applyModifiers(0, mods.acquisition)) : 0;
    this._computed.arcaneMod = mods ? Math.round(applyModifiers(0, mods.arcane)) : 0;
    this._computed.untrainedSkillMod = mods ? Math.round(applyModifiers(0, mods.untrainedSkill)) : 0;
    this._computed.combatOrder = mods ? Math.round(applyModifiers(0, mods.combatOrder)) : 0;
    this._computed.armourZeroEnd = mods ? Math.round(applyModifiers(0, mods.armourZeroEnd)) : 0;

    // Hands max (base 2 + AE modifiers)
    this._baseValues.handsMax = 2;
    this._computed.handsMax = mods ? Math.round(applyModifiers(2, mods.handsMax)) : 2;

    // Hands used (sum of effective hands from items in "inHand" state)
    this._computed.handsUsed = 0;
    for (const item of this.items) {
      if (item.system.carryState === "inHand") {
        const effective = computeEffectiveItemStats(item);
        this._computed.handsUsed += effective.hands;
      }
    }

    // Weapons max (base 3 + AE modifiers)
    this._baseValues.weaponsMax = 3;
    this._computed.weaponsMax = mods ? Math.round(applyModifiers(3, mods.weaponsMax)) : 3;

    // Weapons count
    this._computed.weaponsCount = this.items.filter(item => item.type === "weapon").length;
  }

  /* -------------------------------------------- */
  _prepareSpacecraftDerived(mods) {
    // Compute effective attributes for spacecraft
    const defaultMaxes = this.system.attributemax || {};
    this._baseValues.attributeMaxes = { ...defaultMaxes };
    this._effectiveAttributes = this._computeEffectiveAttributes(SPACECRAFT_ATTRIBUTES, mods, defaultMaxes);
    const ea = this._effectiveAttributes;

    // Initialize sub-objects for base values
    this._baseValues.statMaxes = {};
    this._baseValues.fightTotals = {};

    // Cargo max
    let cargomax = (this.system.size.value * 4) + ea.hull.value - 10 + this.system.stats.cargo.bonus;
    this._baseValues.statMaxes.cargo = cargomax;
    if (mods) cargomax = Math.round(applyModifiers(cargomax, mods.cargoMax));
    if (cargomax != this.system.stats.cargo.max) {
      this.system.stats.cargo.max = cargomax;
      this.update({ 'system.stats.cargo.max': cargomax });
    }

    // Weapon slots max
    let slotmax = this.system.size.value + this.system.stats.weaponsslot.bonus;
    this._baseValues.statMaxes.weaponsslot = slotmax;
    if (mods) slotmax = Math.round(applyModifiers(slotmax, mods.weaponSlotsMax));
    if (slotmax != this.system.stats.weaponsslot.max) {
      this.system.stats.weaponsslot.max = slotmax;
      this.update({ 'system.stats.weaponsslot.max': slotmax });
    }

    // Resupply max
    let resupmax = (this.system.size.value * 2) + this.system.stats.resupply.bonus;
    this._baseValues.statMaxes.resupply = resupmax;
    if (mods) resupmax = Math.round(applyModifiers(resupmax, mods.resupplyMax));
    if (resupmax != this.system.stats.resupply.max) {
      this.system.stats.resupply.max = resupmax;
      this.update({ 'system.stats.resupply.max': resupmax });
    }

    // Velocity max
    let velomax = 6;
    if (velomax != this.system.attributes.velocity.value) {
      this.system.attributes.velocity.value = velomax;
      this.update({ 'system.attributes.velocity.value': velomax });
    }

    // Defence base and total
    let defenceb = this.getDefenseBase();
    if (defenceb != this.system.fight.defence.base) {
      this.system.fight.defence.base = defenceb;
      this.update({ 'system.fight.defence.base': defenceb });
    }
    let defencet = defenceb + this.system.fight.defence.bonus;
    this._baseValues.fightTotals.defence = defencet;
    if (mods) defencet = Math.round(applyModifiers(defencet, mods.defense));
    if (defencet != this.system.fight.defence.total) {
      this.system.fight.defence.total = defencet;
      this.update({ 'system.fight.defence.total': defencet });
    }

    // Armour base and total
    let armourb = this.getBaseArmour();
    if (armourb != this.system.fight.armour.base) {
      this.system.fight.armour.base = armourb;
      this.update({ 'system.fight.armour.base': armourb });
    }
    let armourt = armourb + this.system.fight.armour.bonus;
    this._baseValues.fightTotals.armour = armourt;
    if (mods) armourt = Math.round(applyModifiers(armourt, mods.armour));
    if (armourt != this.system.fight.armour.total) {
      this.system.fight.armour.total = armourt;
      this.update({ 'system.fight.armour.total': armourt });
    }

    // Shield base and total
    let shieldb = 10 + (ea.power.value * this.system.size.value);
    if (shieldb != this.system.fight.shield.base) {
      this.system.fight.shield.base = shieldb;
      this.update({ 'system.fight.shield.base': shieldb });
    }
    let shieldt = shieldb + this.system.fight.shield.bonus;
    this._baseValues.fightTotals.shield = shieldt;
    if (mods) shieldt = Math.round(applyModifiers(shieldt, mods.shield));
    if (shieldt != this.system.fight.shield.total) {
      this.system.fight.shield.total = shieldt;
      this.update({ 'system.fight.shield.total': shieldt });
    }

    // Shield regen
    if (mods && mods.shieldRegen.length) {
      this._computed.shieldRegen = Math.round(applyModifiers(this.system.fight.shield.derivated.regen.value, mods.shieldRegen));
    }

    // Vs ordinance
    let vsordinance = this.system.fight.defence.total + this.system.fight.defence.derivated.vsordinance.bonus;
    if (vsordinance != this.system.fight.defence.derivated.vsordinance.total) {
      this.system.fight.defence.derivated.vsordinance.total = vsordinance;
      this.update({ 'system.fight.defence.derivated.vsordinance.total': vsordinance });
    }

    // Vs boarding (uses effective crew)
    let vsboarding = 10 + this.system.size.value + ea.crew.value + this.system.fight.defence.derivated.vsboarding.bonus;
    if (vsboarding != this.system.fight.defence.derivated.vsboarding.total) {
      this.system.fight.defence.derivated.vsboarding.total = vsboarding;
      this.update({ 'system.fight.defence.derivated.vsboarding.total': vsboarding });
    }

    // At 0 shield
    let at0shield = -1 + this.system.fight.armour.derivated.at0shield.bonus;
    if (at0shield != this.system.fight.armour.derivated.at0shield.total) {
      this.system.fight.armour.derivated.at0shield.total = at0shield;
      this.update({ 'system.fight.armour.derivated.at0shield.total': at0shield });
    }
  }

  /* -------------------------------------------- */
  _prepareNPCDerived(mods) {
    // NPC fight values are user-editable, so compute effective values separately.
    // Keys match system.fight keys (British spelling) so templates can use {{lookup}}.
    this._computed.defence = mods ? Math.round(applyModifiers(this.system.fight.defence.value, mods.defense)) : this.system.fight.defence.value;
    this._computed.armour = mods ? Math.round(applyModifiers(this.system.fight.armour.value, mods.armour)) : this.system.fight.armour.value;
    this._computed.endurance = mods ? Math.round(applyModifiers(this.system.fight.endurance.value, mods.enduranceMax)) : this.system.fight.endurance.value;
    this._computed.movement = mods ? Math.round(applyModifiers(this.system.fight.movement.value, mods.movement)) : this.system.fight.movement.value;
  }

  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {

    if ( changed.system?.influence?.value ) {
      if ( changed.system.influence.value < 0 )
        changed.system.influence.value = 0;
      if ( changed.system.influence.value > this.system.influence.total )
        changed.system.influence.value = this.system.influence.total;
    }

    super._preUpdate(changed, options, user);
  }

  /* -------------------------------------------- */
  getPerks() {
    let search =(this.type == 'character') ? 'perk' : 'spacecraftperk';
    let comp = this.items.filter( item => item.type == search);
    return comp;
  }
  /* -------------------------------------------- */
  getTraits() {
    let search = 'trait';
    if ( this.type == 'character' || this.type == 'npc') {
      search = 'trait';
    } else {
      search = 'spacecrafttrait';
    }
    let comp = this.items.filter( item => item.type == search);
    return comp;
  }
  /* -------------------------------------------- */
  getComplications() {
    let comp = this.items.filter( item => item.type == 'complication');
    return comp;
  }
  /* -------------------------------------------- */
  getSkills() {
    let comp = this.items.filter( item => item.type == 'skill');
    return comp;
  }

  /* -------------------------------------------- */
  prepareSkill(item, type) {
    if (item.type == 'skill' && item.system.type == type) {
      item.system.trainedValue = (item.system.trained) ? 1 : -2
      if (item.system.attribute != "") {
        for( let key in this.system.attributes) {
          if (key == item.system.attribute) { 
            if (this.system.attributes[key].value >= 4) {
              item.system.bonus = 1
            }
            if (this.system.attributes[key].value <= 1) {
              item.system.bonus = -1
            }
          }
        }
      }
      item.system.total = item.system.trainedValue + item.system.bonus;
      if (item.system.staticmod) {item.system.total = item.system.total + item.system.staticmod}

      // Inject effect modifiers for display (transient, not persisted)
      const skillMods = this._effectModifiers?.skills?.[item.id] || [];
      const allSkillMods = this._effectModifiers?.skills?.all || [];
      const combinedMods = [...skillMods, ...allSkillMods];
      item.system._effectMod = combinedMods.length ? Math.round(applyModifiers(0, combinedMods)) : 0;
      item.system._effectiveStaticMod = (item.system.staticmod || 0) + item.system._effectMod;
      item.system._effectiveTotal = item.system.total + item.system._effectMod;

      item.system.isTrait = item.system.traits.length > 0;
      return item;
    }
  }

  /* -------------------------------------------- */
  async equipItem(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item?.system) return;

    const currentState = item.system.carryState || "carried";

    if (item.type === "outfit") {
      // Outfits cycle: carried → active → carried (max 1 active)
      if (currentState === "carried") {
        const updates = [];
        const activeOutfit = this.items.find(i => i.type === "outfit" && i.id !== item.id && i.system.carryState === "active");
        if (activeOutfit) {
          updates.push({ _id: activeOutfit.id, "system.carryState": "carried" });
        }
        updates.push({ _id: item.id, "system.carryState": "active" });
        await this.updateEmbeddedDocuments('Item', updates);
      } else {
        await this.updateEmbeddedDocuments('Item', [{ _id: item.id, "system.carryState": "carried" }]);
      }
    } else if (item.type === "weapon" || item.type === "utility" || item.type === "equipment") {
      // Weapons/utilities/equipment cycle: carried → inHand → carried
      const newState = currentState === "carried" ? "inHand" : "carried";
      await this.updateEmbeddedDocuments('Item', [{ _id: item.id, "system.carryState": newState }]);
    }
  }

  /* -------------------------------------------- */
  async updateWeaponMunitions(weaponId, amountUsed) {
    let item = this.items.find( item => item._id == weaponId );
    let currentMunitions = Number(item.system.munitions);
    let decremented = Math.max(0, currentMunitions - amountUsed);
    let update = { _id: item.id, "system.munitions": String(decremented) };
    await this.updateEmbeddedDocuments('Item', [update]);
  }

    /* -------------------------------------------- */
  async updateShipMunitions(actorId, amountUsed) {
    let decremented = Math.max(0, this.system.fight.munitions.value - amountUsed);
    this.update( { 'system.fight.munitions.value': decremented } );
  }

  /* -------------------------------------------- */
  getSortedSkills() {
    let comp = {};
    comp['primary'] = this.items.filter( item => this.prepareSkill(item, 'primary') );
    comp['personalcombat'] = this.items.filter( item => this.prepareSkill(item, 'personalcombat') );
    comp['spaceshipcombat'] = this.items.filter( item => this.prepareSkill(item, 'spaceshipcombat') );
    return comp;
  }
 
  /* -------------------------------------------- */
  prepareTraitSpecific( actorData, key, traitsAttr ) {
    let trait = traitsAttr.find( item => item.system.subtype == key); // Get the first attribute trait
    if (trait ) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }
  /* -------------------------------------------- */
  prepareSpacecraftTraitSpecific( actorData, key, traitsAttr ) {
    let trait = traitsAttr.find( item => item.system.type == key); // Get the first attribute trait
    if (trait ) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }
  /* -------------------------------------------- */
  prepareTraitsAttributes() {
    let search = (this.type == 'character') ? 'trait' : 'spacecrafttrait';
    let traitsAttr = this.items.filter( item => item.type == search);
    let actorData = this.system;
    
    if ( this.type == 'character') {
      for( let key in actorData.attributes) {
        this.prepareTraitSpecific( actorData.attributes, key, traitsAttr);
      }
      this.prepareTraitSpecific(actorData, "influence", traitsAttr);
      this.prepareTraitSpecific(actorData, "resources", traitsAttr);
      this.prepareTraitSpecific(actorData, "level", traitsAttr);
    } else {
      for( let key in actorData.attributes) {
        this.prepareSpacecraftTraitSpecific( actorData.attributes, key, traitsAttr);
      }
    }
  }

  /* -------------------------------------------- */
  getEquipmentSlotsBase() {
    let activeGear = this.items.filter(item =>
      (item.type === 'outfit' || item.type === 'utility') && item.system.carryState !== "carried"
    );
    let equipmentSlots = 6 + this.system.attributes.strength.value;
    for (let equip of activeGear) {
      if (equip.system.statstotal?.equipmentslots?.value && !isNaN(equip.system.statstotal.equipmentslots.value)) {
        equipmentSlots += Number(equip.system.statstotal.equipmentslots.value);
      }
    }
    return equipmentSlots;
  }
  /* -------------------------------------------- */
  getEquipmentSlotsUsed() {
    const equippableItems = this.items.filter(item =>
      item.type === 'outfit' || item.type === 'utility' || item.type === 'weapon' || item.type === 'equipment'
    );
    let slotsUsed = 0;
    let trinketCount = 0;
    for (const item of equippableItems) {
      const state = item.system.carryState || "carried";
      if (state === "inHand" || state === "active") continue;
      // Check for Trinket keyword — counted separately
      if (findKeywordOnItem(item, "trinket")) {
        trinketCount++;
        continue;
      }
      // Carried items use their effective slots value; inactive outfits cost 4 slots
      const slots = (item.type === "outfit") ? 4 : computeEffectiveItemStats(item).slots;
      slotsUsed += slots;
    }
    // Trinket rule: every 5 trinket items use 1 slot
    if (trinketCount > 0) slotsUsed += Math.ceil(trinketCount / 5);
    return slotsUsed;
  }

    /* -------------------------------------------- */
  getEquipmentSlotsTotal() {
    const base = this.getEquipmentSlotsBase();
    this._baseValues.equipmentSlotsBase = base;
    const mods = this._effectModifiers;
    return mods ? Math.round(applyModifiers(base, mods.equipmentMax)) : base;
  }

  /* -------------------------------------------- */
  getResourcesAllotted() {
    let allotted = 0;
    const equipItems = this.items.filter(item =>
      item.type === 'weapon' || item.type === 'outfit' || item.type === 'utility' || item.type === 'equipment'
    );
    for (const item of equipItems) {
      let cost = 0;
      if (item.type === 'equipment') {
        cost = Number(item.system.cost) || 0;
      } else if (item.type === 'utility') {
        cost = Number(item.system.statstotal?.cost?.value || item.system.stats?.cost?.value) || 0;
      } else {
        // weapon, outfit — use statstotal.resources (includes mods/variations)
        cost = Number(item.system.statstotal?.resources?.value || item.system.stats?.resources?.value) || 0;
      }
      allotted += cost;
    }
    return allotted;
  }

  /* -------------------------------------------- */
  getSkillsTraits() {
    let skills = this.getSkills();
    let skillsTraits = [];
    for( let skill of skills) {
      for (let trait of skill.system.traits) {
        trait.associatedSkill = skill.name;
      }
      skillsTraits = skillsTraits.concat( skill.system.traits );
    }
    return skillsTraits;
  } 

  /* -------------------------------------------- */
  getTrait( traitId  ) {
    let trait = this.items.find( item => item.id == traitId );
    return trait;
  }
  
  /* -------------------------------------------- */
  compareName( a, b) {
    if ( a.name < b.name ) {
      return -1;
    }
    if ( a.name > b.name ) {
      return 1;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getLanguages() {
    return this.items.filter( item => item.type == 'language'  );
  }
  /* -------------------------------------------- */
  getStrongHits() {
    return this.items.filter( item => item.type == 'stronghit'  );
  }
  /* ------------------------------------------- */
  getUtilities() {
    return this.items.filter( item => item.type == 'utility'  );
  }
  /* ------------------------------------------- */
  getEquipments() {
    return this.items.filter( item => item.type == 'utility' || item.type == 'outfit' || item.type == "weapon" || item.type == "equipment");
  }
  
  /* -------------------------------------------- */
  updateWeaponStat( weapon) {
    weapon.system.totalHit = weapon.system.stats.hit.value;
    for (let variation of weapon.system.variations) {
      if (!isNaN(variation.system.stats.hit) ) {
        weapon.system.totalHit += Number(variation.system.stats.hit.value)
      }
    }
    for (let mod of weapon.system.modifications) {
      if (!isNaN(mod.system.stats.hit) ) {
        weapon.system.totalHit += Number(mod.system.stats.hit.value)
      }
    }
  }

  /* -------------------------------------------- */
  getRaces( ) {
    return this.items.filter( item => item.type == 'race' );
  }

  /* -------------------------------------------- */
  getWeapons() {
    let weapons = this.items.filter( item => item.type == 'weapon' );
    for (let weapon of weapons) {
      this.updateWeaponStat(weapon);
    }
    return weapons;
  }

  /* -------------------------------------------- */
  getSpacecraftWeapons() {
    let weapons = this.items.filter( item => item.type == 'spacecraftweapon' );
    return weapons;
  }
  /* -------------------------------------------- */
  getOutfits() {
    return this.items.filter( item => item.type == 'outfit' );
  }

  /* -------------------------------------------- */
  getActiveEffects(matching = it => true) {
    let array = Array.from(this.getEmbeddedCollection("ActiveEffect").values());
    return Array.from(this.getEmbeddedCollection("ActiveEffect").values()).filter(it => matching(it));
  }
  /* -------------------------------------------- */
  getEffectByLabel(label) {
    return this.getActiveEffects().find(it => it.name == label);
  }
  /* -------------------------------------------- */
  getEffectById(id) {
    return this.getActiveEffects().find(it => it.id == id);
  }

  /* -------------------------------------------- */
  getAttribute( attrName ) {
    for( let key in this.system.attributes) {
      let attr = this.system.carac[key];
      if (attr.label.toLowerCase() == attrName.toLowerCase() ) {
        return deepClone(categ.carac[carac]);
      }
    }
  }

  /* -------------------------------------------- */
  async equipGear( equipmentId ) {    
    let item = this.items.find( item => item.id == equipmentId );
    if (item && item.system) {
      let update = { _id: item.id, "system.equipe": !item.system.equipe };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  buildListeActionsCombat( ) {
    let armes = [];
  }
    
  /* -------------------------------------------- */
  saveRollData( rollData) {
    this.currentRollData = rollData;
  }
  /* -------------------------------------------- */
  getRollData( ) {
    return this.currentRollData;
  }
  
  /* -------------------------------------------- */
  getInitiativeScore( phase)  {
    if ( this.type == 'character') {
      const ea = this._effectiveAttributes || {};
      const intCur = ea.intelligence?.current ?? this.system.attributes.intelligence.current;
      const refCur = ea.reflexes?.current ?? this.system.attributes.reflexes.current;
      const combatOrder = this._computed?.combatOrder ?? this.system.combatordermod;
      return intCur + (refCur / 10) + combatOrder;
    } else if (this.type == 'spacecraft') {
      const ea = this._effectiveAttributes || {};
      if (phase == 1) {
        const veloCur = ea.velocity?.current ?? this.system.attributes.velocity.current;
        const crewCur = ea.crew?.current ?? this.system.attributes.crew.current;
        return veloCur + (crewCur / 10);
      } else {
        const cpuCur = ea.cpu?.current ?? this.system.attributes.cpu.current;
        const crewCur = ea.crew?.current ?? this.system.attributes.crew.current;
        return cpuCur + (crewCur / 10);
      }
    }
    return 0.0;
  }

  /* -------------------------------------------- */
  getDefenseBase() {
    if (this.type == 'character') {
      let outfitBonus = 0;
      let outfits = this.items.filter(item => (item.type === 'outfit' || item.type === 'utility') && item.system.carryState !== "carried");
      for (let item of outfits) {
        if ( !isNaN(item.system.statstotal?.defence?.value)) {
          outfitBonus += Number(item.system.statstotal.defence.value);
        }
      }
      return 10 + this.system.attributes.reflexes.value + outfitBonus;
    }
    if (this.type == 'spacecraft') {
      return 12 - this.system.size.value + this.system.attributes.engines.value;
    }
    return 0;
  }

  /* -------------------------------------------- */
  getDefenseTotal() {
    if (this.type == 'character') {
      return this.system.defensebonus.total;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getVsOrdinance() {
    if (this.type == 'spacecraft') {
      return this.system.fight.defence.value + this.system.fight.defence.vsordinance;
    }
  }
  /* -------------------------------------------- */
  getBaseArmour( ) {
    if (this.type == 'character') {
      let armour = 0;
      let outfits = this.items.filter(item => (item.type === 'outfit' || item.type === 'utility') && item.system.carryState !== "carried");
      for (let item of outfits) {
        if ( !isNaN(item.system.statstotal?.armour?.value)) {
          armour += Number(item.system.statstotal.armour.value);
        }
      }
      return armour;
    }
    if (this.type == 'spacecraft') {
      return 3;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getTotalArmour( ) {
    if (this.type == 'character') {
      let total = this.getBaseArmour();
      this._baseValues.armourTotal = total;
      const mods = this._effectModifiers;
      if (mods) total = Math.round(applyModifiers(total, mods.armour));
      this.system.armourbonus.total = total;
      return total;
    }
    if (this.type == 'spacecraft') {
      return this.system.fight.armour.total;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getTradeGoods( ) {
    let tradeGoods = this.items.filter( item => item.type == 'tradegood' );
    for (let good of tradeGoods) {
      if (good.system.type == "money") {
        good.system.cargoSpace = 0;
      }
      if (good.system.type == "loot") {
        good.system.cargoSpace = .25;
      }
      if (good.system.type == "freight") {
        good.system.cargoSpace = 1;
      }
    }
    return tradeGoods;
  }
  /* -------------------------------------------- */
  getCargoSpaceUsed( ) {
    let tradeGoods = this.items.filter( item => item.type == 'tradegood' );
    let cargoSpaceUsed = 0;
    for (let good of tradeGoods) {
      cargoSpaceUsed = cargoSpaceUsed + good.system.cargoSpace
    }
    return cargoSpaceUsed;
  }
  /* -------------------------------------------- */
  getResearch( ) {
    let research = this.items.filter( item => item.type == 'research' );
    return research;

  }
  /* -------------------------------------------- */
  getSubActors() {
    let subActors = [];
    for (let id of this.system.subactors) {
      subActors.push(foundry.utils.deepClone(game.actors.get(id)));
    }
    return subActors;
  }
  /* -------------------------------------------- */
  async addSubActor( subActorId) {
    let subActors = foundry.utils.deepClone( this.system.subactors);
    subActors.push( subActorId);
    await this.update( { 'system.subactors': subActors } );
  }
  /* -------------------------------------------- */
  async delSubActor( subActorId) {
    let newArray = [];
    for (let id of this.system.subactors) {
      if ( id != subActorId) {
        newArray.push( id);
      }
    }
    await this.update( { 'system.subactors': newArray } );
  }
  /* -------------------------------------------- */
  decrementGritRerolls() {
    if ( this.type == 'character' && this.system.gritreroll.value > 0 ) {
      let newGritReroll = this.system.gritreroll.value - 1;
      this.system.gritreroll.value = newGritReroll;
      this.update( { 'system.gritreroll.value': newGritReroll } );
      return newGritReroll;
    }
    return false;
  }
  /* -------------------------------------------- */
  getGrit() {
    if ( this.type == 'character' && this.system.gritreroll.value > 0 ) {
      return this.system.gritreroll.value;
    }
    if ( this.type == 'spacecraft' ) {
      return this.system.fight.gritreroll.value;
    }
    return false;
  }

  /* -------------------------------------------- */
  async rollSkill( competenceId ) {
    let skill = this.items.find( item => item.type == 'skill' && item.id == competenceId);
    if (skill) {
      let rollData = {
        mode: "skill",
        alias: this.name, 
        actorImg: this.img,
        actorId: this.id,
        img: skill.img,
        hasFate: this.getGrit(),
        rollMode: game.settings.get("core", "rollMode"),
        title: game.i18n.format("FE2.Dialog.SkillTitle", {name: skill.name, total: skill.system.total}),
        skill: skill,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( ),
        difficulty: 0,
        useToolbox: false,
        useDedicatedworkshop: false,
        toolsAvailable: skill.system.toolbox || skill.system.useDedicatedworkshop
      }
      if (skill.system.staticmod) {rollData.bonusMalus += skill.system.staticmod}
      if (skill.system.toolbox == true) {rollData.useToolbox = true}
      rollData.effectModifiers = this._effectModifiers;
      rollData.untrainedSkillMod = this._computed?.untrainedSkillMod || 0;
      rollData.arcaneMod = this._computed?.arcaneMod || 0;
      await FraggedEmpireRoll.create( this, rollData);
    } else {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.SkillNotFound"));
    }
  }

  /* -------------------------------------------- */
  async rollAcquisition() {
    let primarySkills = this.items.filter(item => item.type == 'skill' && item.system.type == 'primary');
    let skill = primarySkills.find(s => s.name.toLowerCase().includes('wealth')) || primarySkills[0];
    if (!skill) {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.SkillNotFound"));
      return;
    }
    let rollData = {
      mode: "skill",
      alias: this.name,
      actorImg: this.img,
      actorId: this.id,
      img: skill.img,
      hasFate: this.getGrit(),
      rollMode: game.settings.get("core", "rollMode"),
      title: game.i18n.localize("FE2.Dialog.AcquisitionRoll"),
      skill: skill,
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      bonusMalus: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions(),
      difficulty: 0,
      useToolbox: false,
      useDedicatedworkshop: false,
      toolsAvailable: skill.system.toolbox || skill.system.dedicatedworkshop,
      acquisitionMod: this._computed?.acquisitionMod || 0
    };
    if (skill.system.staticmod) rollData.bonusMalus += skill.system.staticmod;
    if (skill.system.toolbox) rollData.useToolbox = true;
    rollData.effectModifiers = this._effectModifiers;
    rollData.untrainedSkillMod = this._computed?.untrainedSkillMod || 0;
    rollData.arcaneMod = this._computed?.arcaneMod || 0;
    await FraggedEmpireRoll.create(this, rollData);
  }

  /* -------------------------------------------- */
  async rollGenericSkill( ) {
    let rollData = {
      mode: "genericskill",
      alias: this.name,
      actorImg: this.img,
      actorId: this.id,
      img: this.img,
      hasFate: this.getGrit(),
      rollMode: game.settings.get("core", "rollMode"),
      title: game.i18n.localize("FE2.Dialog.GenericSkillRoll"),
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      bonusMalus: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( ),
      difficulty: 0
    }
    rollData.effectModifiers = this._effectModifiers;
    await FraggedEmpireRoll.create( this, rollData);
  }

  /* -------------------------------------------- */
  async rollWeapon( weaponId ) {
    let intstat = 0;
    let weapon = this.items.find( item => item.id == weaponId);
      const target = game.user.targets.first();
    if (Object.is( target, undefined )) { 
      ui.notifications.error(game.i18n.localize("FE2.Notifications.TargetNotFound"));
      return
    }
    if (target.actor.type == 'npc' && target.actor.system.npctype == 'henchman') {
      intstat = target.actor.system.stats.Attribute.value;
    } else { 
      intstat = target.actor.system.attributes.intelligence.current ;
    }

    this.updateWeaponStat( weapon);
    if ( weapon ) {
      
      let rollData = {
        mode: 'weapon',
        alias: this.name, 
        actorId: this.id,
        actorImg: this.img,
        img: weapon.img,
        target: target.actor,
        hasGrit: this.getGrit(),
        bMHitDice: 0,
        rollMode: game.settings.get("core", "rollMode"),
        title: game.i18n.format("FE2.Dialog.AttackTitle", {name: weapon.name}),
        weapon: weapon,
        rofValue: 1,
        cover: 0,
        intmod: 0,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( )
      }
      // Add skill for character only
      if (this.type == 'character') {
        let weaponSkills = this.items.filter( item => item.type == 'skill' && item.system.type == 'personalcombat');
        rollData.weaponSkills =  weaponSkills;
        let combatSkill = weaponSkills[0];
        if ( weapon.system.defaultskill != "") {
          combatSkill = this.items.find( item => item.type == 'skill' && item.system.type == 'personalcombat' && item.name == weapon.system.defaultskill);
        }
        rollData.skillId = combatSkill.id;
        rollData.skill = combatSkill;
        rollData.useMunitions = false;
        rollData.munitionsUsed = 0;
      } else if (this.type == 'npc' && this.system.npctype == 'henchman') {
        rollData.weapon.system.statstotal.enddmg.value = Number(this.system.stats.Attribute.value) + Number(rollData.weapon.system.statstotal.enddmg.value)
      }
      rollData.effectModifiers = this._effectModifiers;
      rollData.effectHitBonus = this._computed?.hitBonus || 0;
      rollData.effectEndDmg = this._computed?.enduranceDamage || 0;
      rollData.untrainedSkillMod = this._computed?.untrainedSkillMod || 0;
      await FraggedEmpireRoll.create( this, rollData);
    } else {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.WeaponNotFound"), weaponId);
    }
  }
  /* -------------------------------------------- */
  buildNPCRoFArray( ) {
    let bodiesBase = Number(this.system.spec.bodies.value);
    let rofMax = bodiesBase || 1;
    return FraggedEmpireUtility.createDirectOptionList(1, rofMax);
  }

  /* -------------------------------------------- */
  async rollNPCFight( ) {    

    let rollData = {
      mode: 'npcfight',
      alias: this.name, 
      actorId: this.id,
      img: this.img,
      hasFate: this.getGrit(),
      npcstats: foundry.utils.deepClone(this.system.stats),
      rollMode: game.settings.get("core", "rollMode"),
      title: game.i18n.format("FE2.Dialog.AttackTitle", {name: this.name}),
      weaponRoFOptions: this.buildNPCRoFArray(), 
      rofValue: 1,
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      bonusMalus: 0,
      bMHitDice: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( )
    }
    rollData.effectModifiers = this._effectModifiers;
    await FraggedEmpireRoll.create( this, rollData);
  }

  /* -------------------------------------------- */
  async rollSpacecraftWeapon( weaponId ) {
      let weapon = this.items.find( item => item.id == weaponId);
      const target = game.user.targets.first();
      
      // Build available actor/skills
      let actorList = []
      if (game.user.isGM )  {
        let actorNPCship = this.items.filter( item => item.name == 'Rival' || item.name == 'Outclassed' || item.name == 'Outgunned')
        if (actorNPCship.length != 0) {
        } else {
          for (let actor of game.actors) {
            actorList.push( { id:actor.id, name:actor.name, skills:actor.items.filter( item => item.type == 'skill' && item.system.type == 'spaceshipcombat') } );
          }
        }
      } else {
        let actorWeapon = game.user.character;
        actorList.push( { id:actorWeapon.id, name:actorWeapon.name, skills:actorWeapon.items.filter( item => item.type == 'skill' && item.system.type == 'spaceshipcombat') } );
      }

      // Skill prepare
      if (actorList.length != 0) {
        let skill = actorList[0].skills[0]; 
        skill.system.trainedValue = (skill.system.trained) ? 1 : -2
        skill.system.total = skill.system.trainedValue + skill.system.bonus;
        skill.system.isTrait = skill.system.traits.length > 0; 
      } else {
        actorList.push( { id:0, name:game.i18n.localize("FE2.Sheet.NPC.Commander"), skills:[{ id:99, name:"NPC Combat", system:{total:0} }] } );
      }

      if ( weapon ) {
        let rollData = {
          mode: 'spacecraftweapon',
          alias: this.name, 
          actorId: this.id,
          actorList: actorList,
          img: weapon.img,

          rollMode: game.settings.get("core", "rollMode"),
          title: game.i18n.format("FE2.Dialog.SpacecraftAttackTitle", {name: weapon.name}),
          weapon: weapon,
          munitions: this.system.fight.munitions.value,
          hasGrit: this.getGrit(),
          skillId: actorList[0].skills[0].id,
          skill: actorList[0].skills[0],
          optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
          optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( ),
          bonusMalus: 0,
          bMHitDice: 0,
          isGM: game.user.isGM,
          target: target.actor
        }
        let rofMax = 1;
        rollData.rofValue = rofMax;
        rollData.effectModifiers = this._effectModifiers;

        await FraggedEmpireRoll.create( this, rollData);
      } else {
        ui.notifications.warn(game.i18n.localize("FE2.Notifications.WeaponNotFound"), weaponId);
      }
    }
  
  /* -------------------------------------------- */
  async incrementeArgent( arme ) {
    let monnaie = this.items.find( item => item.type == 'monnaie' && item.name == arme.name);
    if (monnaie) {
      let newValeur = monnaie.system.nombre + 1;
      await this.updateEmbeddedDocuments('Item', [{ _id: monnaie.id, 'system.nombre': newValeur }]);
    }
  }
  /* -------------------------------------------- */
  async decrementeArgent( arme ) {
    let monnaie = this.items.find( item => item.type == 'monnaie' && item.name == arme.name);
    if (monnaie) {
      let newValeur = monnaie.system.nombre - 1;
      newValeur = (newValeur <= 0) ? 0 : newValeur;
      await this.updateEmbeddedDocuments('Item', [{ _id: monnaie.id, 'system.nombre': newValeur }]);
    }
  }
  
  /* -------------------------------------------- */
  async incrementeQuantite( objetId ) {
    let objetQ = this.items.find( item => item.id == objetId );
    if (objetQ) {
      let newQ = objetQ.system.quantite + 1;
      await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.quantite': newQ }]);
    }
  }

  /* -------------------------------------------- */
  async decrementeQuantite( objetId ) {
    let objetQ = this.items.find( item => item.id == objetId );
    if (objetQ) {
      let newQ = objetQ.system.quantite - 1;
      newQ = (newQ <= 0) ? 0 : newQ;
      await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.quantite': newQ }]);
    }
  }
    
}
