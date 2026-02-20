import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

/* -------------------------------------------- */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class FraggedEmpireNPCSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["foundry-fe2", "sheet", "actor", "npc"],
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
      lockUnlockSheet: FraggedEmpireNPCSheet.#onLockUnlockSheet,
      createEffect: FraggedEmpireNPCSheet.#onCreateEffect,
      editEffect: FraggedEmpireNPCSheet.#onEditEffect,
      toggleEffect: FraggedEmpireNPCSheet.#onToggleEffect,
      deleteEffect: FraggedEmpireNPCSheet.#onDeleteEffect,
      stepUp: FraggedEmpireNPCSheet.#onStepUp,
      stepDown: FraggedEmpireNPCSheet.#onStepDown
    },
    dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
  };

  /** @override */
  static PARTS = {
    body: {
      template: "systems/foundry-fe2/templates/npc-sheet.html",
      scrollable: [".sheet-body"]
    }
  };

  tabGroups = { primary: "main" };

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
    context.effectCategories = FraggedEmpireUtility.categorizeEffects(actor);
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
    context.disableScore = !this._editScore;
    context.isGM = game.user.isGM;
    context.computed = actor._computed || {};
    context.baseValues = actor._baseValues || {};

    // NPC type flags
    context.isCompanion = actor.system.npctype === "companion";

    // Companion controller resolution
    if (context.isCompanion) {
      context.characterActors = game.actors.filter(a => a.type === "character");
      const controller = actor.system.getController();
      if (controller) {
        context.controllerName = controller.name;
        context.controllerAttributes = controller.system.attributes;
      }
    }

    // Keywords, variations, modifications (owned items)
    context.keywords = actor.system.getKeywords();
    context.variations = actor.system.getVariations();
    context.modifications = actor.system.getModifications();

    // Enrich HTML for prose-mirror collapsed display
    const enrichOptions = { async: true, relativeTo: actor };
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.description ?? "", enrichOptions);
    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.notes ?? "", enrichOptions);
    context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.gmnotes ?? "", enrichOptions);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _preRender(context, options) {
    await super._preRender(context, options);
    const sheetBody = this.element?.querySelector('.sheet-body');
    const scrollTop = sheetBody?.scrollTop ?? 0;
    if (scrollTop > 0) this._savedScrollTop = scrollTop;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Activate tabs after render (V2 does not auto-activate from tabGroups)
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      if (!tab) continue;
      const tabElement = this.element?.querySelector(`[data-tab="${tab}"][data-group="${group}"]`);
      if (tabElement) this.changeTab(tab, group, {force: true});
    }

    // Restore scroll position after layout is complete
    requestAnimationFrame(() => {
      const sheetBody = this.element?.querySelector('.sheet-body');
      if (sheetBody && this._savedScrollTop) {
        sheetBody.scrollTop = this._savedScrollTop;
      }
    });
  }

  /* -------------------------------------------- */
  /*  Action Handlers                              */
  /* -------------------------------------------- */

  static #onEditItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    this.document.items.get(itemId)?.sheet.render(true);
  }

  static #onDeleteItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    FraggedEmpireUtility.confirmDelete(this.document, itemId);
  }

  static #onEquipItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    this.document.equipItem(itemId);
  }

  static #onRollSkill(event, target) {
    const skillId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!skillId) return;
    this.document.rollSkill(skillId);
  }

  static #onRollWeapon(event, target) {
    const weaponId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!weaponId) return;
    this.document.rollWeapon(weaponId);
  }

  static #onRollNPCFight(event, target) {
    this.document.rollNPCFight();
  }

  static #onRollGenericSkill(event, target) {
    this.document.rollGenericSkill();
  }

  static #onLockUnlockSheet(event, target) {
    this._editScore = !this._editScore;
    this.render();
  }

  /* -------------------------------------------- */
  /*  Effect Action Handlers                      */
  /* -------------------------------------------- */

  static #onCreateEffect(event, target) {
    const effectData = {
      name: game.i18n.localize("FE2.Effects.UI.AddEffect"),
      img: "icons/svg/aura.svg",
      origin: this.document.uuid,
      transfer: false,
      disabled: false
    };
    this.document.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }

  static #onEditEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;
    const effect = this.document.effects.get(effectId);
    effect?.sheet.render(true);
  }

  static #onToggleEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;
    const effect = this.document.effects.get(effectId);
    if (effect) effect.update({ disabled: !effect.disabled });
  }

  static async #onDeleteEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("FE2.Dialog.ConfirmRemoveTitle") },
      content: "<p>" + game.i18n.localize("FE2.Dialog.ConfirmRemoveContent") + "</p>"
    });
    if (confirmed) {
      this.document.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
    }
  }

  static #onStepUp(event, target) {
    FraggedEmpireUtility.handleStepperAction(this, target, "up", event);
  }

  static #onStepDown(event, target) {
    FraggedEmpireUtility.handleStepperAction(this, target, "down", event);
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

    if (data?.type === "Item") {
      const item = await fromUuid(data.uuid);
      if (!item) return super._onDrop(event);

      // Enforce single-variation limit: replace existing variation
      if (item.type === "variation") {
        const existing = this.document.items.filter(i => i.type === "variation");
        if (existing.length > 0) {
          await this.document.deleteEmbeddedDocuments("Item", existing.map(i => i.id));
        }
      }
    }

    super._onDrop(event);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  async _onChangeForm(formConfig, event) {
    const target = event?.target;
    if (!target?.name) return;
    // Build update from the single changed field only — collecting the entire form
    // via FormDataExtended omits disabled fields, which can blank out locked inputs.
    let value = target.value;
    if (target.dataset.dtype === "Number") value = Number(value) || 0;
    const updateData = foundry.utils.expandObject({ [target.name]: value });

    // When NPC type changes away from companion, clear controllerId
    if (target.name === "system.npctype" && value !== "companion") {
      updateData.system = updateData.system || {};
      updateData.system.controllerId = "";
    }

    await this.document.update(updateData);
  }
}
