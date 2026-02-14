import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

/* -------------------------------------------- */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class FraggedEmpireNPCSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["fragged-empire", "sheet", "actor"],
    position: { width: 640, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editItem: FraggedEmpireNPCSheet.#onEditItem,
      deleteItem: FraggedEmpireNPCSheet.#onDeleteItem,
      equipItem: FraggedEmpireNPCSheet.#onEquipItem,
      rollSkill: FraggedEmpireNPCSheet.#onRollSkill,
      rollWeapon: FraggedEmpireNPCSheet.#onRollWeapon,
      rollNPCFight: FraggedEmpireNPCSheet.#onRollNPCFight,
      rollGenericSkill: FraggedEmpireNPCSheet.#onRollGenericSkill,
      lockUnlockSheet: FraggedEmpireNPCSheet.#onLockUnlockSheet
    },
    dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
  };

  /** @override */
  static PARTS = {
    body: { template: "systems/foundry-fe2/templates/npc-sheet.html" }
  };

  tabGroups = { primary: "attribute" };

  _editScore = false;

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    actor.prepareTraitsAttributes();

    context.name = actor.name;
    context.img = actor.img;
    context.system = actor.system;
    context.cssClass = this.isEditable ? "editable" : "locked";
    context.effects = actor.effects.map(e => foundry.utils.deepClone(e));
    context.limited = actor.limited;
    context.equipments = actor.getEquipments();
    context.defenseBase = actor.getDefenseBase();
    context.defenseTotal = actor.getDefenseTotal();
    context.armourBase = actor.getBaseArmour();
    context.armourTotal = actor.getTotalArmour();
    context.weapons = actor.getWeapons();
    context.traits = actor.getTraits();
    context.optionsDMDP = FraggedEmpireUtility.createDirectOptionList(-3, +3);
    context.optionsBase = FraggedEmpireUtility.createDirectOptionList(0, 20);
    context.owner = actor.isOwner;
    context.npcTypeChoices = FraggedEmpireUtility.buildNPCTypeChoices();
    context.editScore = this._editScore ??= false;
    context.isGM = game.user.isGM;

    // Enrich HTML for prose-mirror collapsed display
    const enrichOptions = { async: true, relativeTo: actor };
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.description ?? "", enrichOptions);
    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.notes ?? "", enrichOptions);
    context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.gmnotes ?? "", enrichOptions);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Activate tabs after render (V2 does not auto-activate from tabGroups)
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      if (tab) this.changeTab(tab, group, {force: true});
    }
  }

  /* -------------------------------------------- */
  /*  Action Handlers                              */
  /* -------------------------------------------- */

  /**
   * Open the sheet for an owned item.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onEditItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    this.document.items.get(itemId)?.sheet.render(true);
  }

  /**
   * Delete an owned item after confirmation.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onDeleteItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    FraggedEmpireUtility.confirmDelete(this.document, itemId);
  }

  /**
   * Toggle the equipped state of an item.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onEquipItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    this.document.equipItem(itemId);
  }

  /**
   * Roll a skill check.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onRollSkill(event, target) {
    const skillId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!skillId) return;
    this.document.rollSkill(skillId);
  }

  /**
   * Roll a weapon attack.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onRollWeapon(event, target) {
    const weaponId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!weaponId) return;
    this.document.rollWeapon(weaponId);
  }

  /**
   * Roll the NPC fight action.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onRollNPCFight(event, target) {
    this.document.rollNPCFight();
  }

  /**
   * Roll a generic skill check.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onRollGenericSkill(event, target) {
    this.document.rollGenericSkill();
  }

  /**
   * Toggle the lock/unlock state of the sheet for score editing.
   * @this {FraggedEmpireNPCSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onLockUnlockSheet(event, target) {
    this._editScore = !this._editScore;
    this.render();
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  async _onChangeForm(formConfig, event) {
    const form = this.form;
    if (!form) return;
    const formData = new foundry.applications.ux.FormDataExtended(form);
    const data = foundry.utils.expandObject(formData.object);
    await this.document.update(data);
  }
}
