/**
 * Character actor sheet using Application V2.
 * @extends {ActorSheetV2}
 */

import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

/* -------------------------------------------- */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class FraggedEmpireActorSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    classes: ["fragged-empire", "sheet", "actor"],
    position: { width: 640, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    actions: {
      editItem: FraggedEmpireActorSheet.#onEditItem,
      deleteItem: FraggedEmpireActorSheet.#onDeleteItem,
      equipItem: FraggedEmpireActorSheet.#onEquipItem,
      rollSkill: FraggedEmpireActorSheet.#onRollSkill,
      rollWeapon: FraggedEmpireActorSheet.#onRollWeapon,
      editSubActor: FraggedEmpireActorSheet.#onEditSubActor,
      deleteSubActor: FraggedEmpireActorSheet.#onDeleteSubActor,
      rollNPCFight: FraggedEmpireActorSheet.#onRollNPCFight,
      lockUnlockSheet: FraggedEmpireActorSheet.#onLockUnlockSheet,
      viewSkillTrait: FraggedEmpireActorSheet.#onViewSkillTrait,
      viewTraitLink: FraggedEmpireActorSheet.#onViewTraitLink,
      viewItemLink: FraggedEmpireActorSheet.#onViewItemLink,
      rollWeaponDamage: FraggedEmpireActorSheet.#onRollWeaponDamage,
      rollWeaponDamageCritical: FraggedEmpireActorSheet.#onRollWeaponDamageCritical
    }
  };

  /* -------------------------------------------- */
  static PARTS = {
    body: { template: "systems/foundry-fe2/templates/actor-sheet.html" }
  };

  /* -------------------------------------------- */
  tabGroups = { primary: "attribute" };

  /* -------------------------------------------- */
  /** Instance-level edit score toggle */
  _editScore = false;

  /* -------------------------------------------- */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    actor.prepareTraitsAttributes();
    let actorData = foundry.utils.deepClone(actor);
    let sortedSkills = actor.getSortedSkills();

    Object.assign(context, {
      title: this.title,
      id: actor.id,
      type: actor.type,
      img: actor.img,
      name: actor.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: actorData.system,
      effects: actor.effects.map(e => foundry.utils.deepClone(e)),
      limited: actor.limited,
      sortedSkills: sortedSkills,
      weapons: actor.getWeapons(),
      strongHits: actor.getStrongHits(),
      races: actor.getRaces(),
      outfits: actor.getOutfits(),
      utilities: actor.getUtilities(),
      equipments: actor.getEquipments(),
      languages: actor.getLanguages(),
      defenseBase: actor.getDefenseBase(),
      defenseTotal: actor.getDefenseTotal(),
      armourBase: actor.getBaseArmour(),
      armourTotal: actor.getTotalArmour(),
      tradeGoods: actor.getTradeGoods(),
      researches: actor.getResearch(),
      perks: actor.getPerks(),
      traits: actor.getTraits(),
      skillsTraits: actor.getSkillsTraits(),
      complications: actor.getComplications(),
      equipmentsSlotsBase: actor.getEquipmentSlotsBase(),
      equipmentsSlotsTotal: actor.getEquipmentSlotsTotal(),
      equipmentsSlotsUsed: actor.getEquipmentSlotsUsed(),
      subActors: actor.getSubActors(),
      optionsDMDP: FraggedEmpireUtility.createDirectOptionList(-3, +3),
      optionsBase: FraggedEmpireUtility.createDirectOptionList(0, 20),
      owner: actor.isOwner,
      editScore: this._editScore,
      isGM: game.user.isGM
    });

    // Enrich HTML for prose-mirror collapsed display
    const enrichOptions = { async: true, relativeTo: actor };
    context.enrichedBioDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.biosystem?.description ?? "", enrichOptions);
    context.enrichedBioNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.biosystem?.notes ?? "", enrichOptions);
    context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.gmnotes ?? "", enrichOptions);

    this._formData = context;
    return context;
  }

  /* -------------------------------------------- */
  _onRender(context, options) {
    super._onRender(context, options);

    // Activate tabs after render (V2 does not auto-activate from tabGroups)
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      if (tab) this.changeTab(tab, group, {force: true});
    }

    if (!this.isEditable) return;

    // Munitions field change handler (special case for inline weapon munitions inputs)
    const munitionsInputs = this.element.querySelectorAll(".weapon-munitions-label input");
    for (const input of munitionsInputs) {
      input.addEventListener("change", (event) => {
        const weaponId = event.target.name;
        const value = event.target.value;
        this.document.updateWeaponMunitions(weaponId, value);
      });
    }
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  static #onEditItem(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const item = this.document.items.get(itemId);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onDeleteItem(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    FraggedEmpireUtility.confirmDelete(this.document, itemId);
  }

  /* -------------------------------------------- */
  static #onEquipItem(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.document.equipItem(itemId);
  }

  /* -------------------------------------------- */
  static #onRollSkill(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const skillId = itemRow.dataset.itemId;
    this.document.rollSkill(skillId);
  }

  /* -------------------------------------------- */
  static #onRollWeapon(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const weaponId = itemRow.dataset.itemId;
    this.document.rollWeapon(weaponId);
  }

  /* -------------------------------------------- */
  static #onEditSubActor(event, target) {
    const itemRow = target.closest("[data-actor-id]");
    if (!itemRow) return;
    const actorId = itemRow.dataset.actorId;
    const actor = game.actors.get(actorId);
    actor?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onDeleteSubActor(event, target) {
    const itemRow = target.closest("[data-actor-id]");
    if (!itemRow) return;
    const actorId = itemRow.dataset.actorId;
    this.document.delSubActor(actorId);
  }

  /* -------------------------------------------- */
  static #onRollNPCFight(event, target) {
    const itemRow = target.closest("[data-actor-id]");
    if (!itemRow) return;
    const actorId = itemRow.dataset.actorId;
    const actor = game.actors.get(actorId);
    actor?.rollNPCFight();
  }

  /* -------------------------------------------- */
  static #onLockUnlockSheet(event, target) {
    this._editScore = !this._editScore;
    this.render();
  }

  /* -------------------------------------------- */
  static #onViewSkillTrait(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    if (itemId && itemId !== "" && this._formData) {
      const itemData = this._formData.skillsTraits.find(item => item._id === itemId);
      if (itemData) {
        Item.create(itemData, { temporary: true }).then(trait => {
          trait.sheet.render(true);
        });
      }
    }
  }

  /* -------------------------------------------- */
  static #onViewTraitLink(event, target) {
    const itemId = target.dataset.itemId ?? target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    const item = this.document.items.get(itemId);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onViewItemLink(event, target) {
    const itemId = target.dataset.itemId ?? target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    const item = this.document.items.get(itemId);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onRollWeaponDamage(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const weapon = this.document.items.get(itemId);
    if (weapon) this.document.rollDamage(weapon, "damage");
  }

  /* -------------------------------------------- */
  static #onRollWeaponDamageCritical(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const weapon = this.document.items.get(itemId);
    if (weapon) this.document.rollDamage(weapon, "criticaldamage");
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  async _onDrop(event) {
    let data;
    try {
      data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    } catch (e) {
      return;
    }
    if (data && data.type === "Actor" && data.uuid) {
      const droppedActor = await fromUuid(data.uuid);
      if (droppedActor) {
        this.document.addSubActor(droppedActor.id);
        return;
      }
    }
    super._onDrop(event);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  async _onChangeForm(formConfig, event) {
    // Munitions inputs are handled by dedicated event listeners in _onRender
    if (event?.target?.closest(".weapon-munitions-label")) return;
    const form = this.form;
    if (!form) return;
    const formData = new foundry.applications.ux.FormDataExtended(form);
    const data = foundry.utils.expandObject(formData.object);
    await this.document.update(data);
  }
}
