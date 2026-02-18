import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { getKeywordsForType, getKeywordById } from "./keyword-config.js";

/**
 * Item sheet using Application V2.
 * @extends {ItemSheetV2}
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class FraggedEmpireItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    classes: ["foundry-fe2", "sheet", "item"],
    position: { width: 620, height: 550 },
    window: {
      resizable: true,
      controls: [
        {
          icon: "fas fa-comment",
          label: "FE2.Sheet.Common.PostToChat",
          action: "postItem"
        }
      ]
    },
    form: { submitOnChange: true },
    actions: {
      postItem: FraggedEmpireItemSheet.#onPostItem,
      viewVariation: FraggedEmpireItemSheet.#onViewVariation,
      viewModification: FraggedEmpireItemSheet.#onViewModification,
      viewTrait: FraggedEmpireItemSheet.#onViewTrait,
      deleteEmbedded: FraggedEmpireItemSheet.#onDeleteEmbedded,
      createEffect: FraggedEmpireItemSheet.#onCreateEffect,
      editEffect: FraggedEmpireItemSheet.#onEditEffect,
      toggleEffect: FraggedEmpireItemSheet.#onToggleEffect,
      deleteEffect: FraggedEmpireItemSheet.#onDeleteEffect,
      removeKeyword: FraggedEmpireItemSheet.#onRemoveKeyword
    },
  };

  /* -------------------------------------------- */
  static PARTS = {
    body: {
      template: "systems/foundry-fe2/templates/item-skill-sheet.html",
      scrollable: [".sheet-body"]
    }
  };

  /* -------------------------------------------- */
  /**
   * Dynamically configure render parts to use the correct template for this item type.
   * @param {HandlebarsRenderOptions} options
   * @returns {Record<string, HandlebarsTemplatePart>}
   * @protected
   */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (this.document.type) {
      parts.body.template = `systems/foundry-fe2/templates/item-${this.document.type}-sheet.html`;
    }
    return parts;
  }

  /* -------------------------------------------- */
  tabGroups = { primary: "details" };

  /* -------------------------------------------- */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const itemData = foundry.utils.deepClone(item);

    context.title = this.title;
    context.id = item.id;
    context.type = item.type;
    context.img = item.img;
    context.name = item.name;
    context.editable = this.isEditable;
    context.cssClass = this.isEditable ? "editable" : "locked";
    context.system = itemData.system;
    context.combatSkills = FraggedEmpireUtility.getSkillsType("personalcombat");
    context.optionsBase = FraggedEmpireUtility.createDirectOptionList(0, 20);

    // Keyword enrichment for item types that support keywords
    const KEYWORD_ITEM_TYPES = new Set(["weapon", "outfit", "utility", "equipment", "spacecraftweapon"]);
    if (KEYWORD_ITEM_TYPES.has(item.type)) {
      const activeKeywords = Array.isArray(itemData.system.keywords) ? itemData.system.keywords : [];
      const activeIds = new Set(activeKeywords.map(k => k.id));
      context.keywordsEnriched = activeKeywords.map(kw => {
        const def = getKeywordById(kw.id);
        if (!def) return null;
        return {
          id: kw.id,
          label: game.i18n.localize(def.label),
          description: game.i18n.localize(def.description),
          params: def.params.map(p => ({
            key: p.key,
            label: game.i18n.localize(p.label),
            value: kw[p.key] ?? ""
          }))
        };
      }).filter(Boolean);
      context.availableKeywords = getKeywordsForType(item.type)
        .filter(kw => !activeIds.has(kw.id))
        .map(kw => ({ id: kw.id, label: game.i18n.localize(kw.label) }))
        .sort((a, b) => a.label.localeCompare(b.label));
      context.hasAvailableKeywords = context.availableKeywords.length > 0;
    }
    context.limited = item.limited;
    context.owner = item.isOwner;
    context.isGM = game.user.isGM;
    context.effects = item.effects.map(e => ({
      _id: e.id,
      name: e.name,
      img: e.img,
      tint: e.tint ?? "#ffffff",
      disabled: e.disabled,
      active: !e.disabled,
      effect: e
    }));

    // Type-specific choice objects for selectOptions
    switch (item.type) {
      case "weapon":
        context.weaponTypeChoices = FraggedEmpireUtility.buildWeaponTypeChoices();
        context.defaultSkillChoices = this.#buildDefaultSkillChoices(context.combatSkills);
        break;
      case "modification":
        context.modificationTypeChoices = FraggedEmpireUtility.buildModificationTypeChoices();
        context.weaponTypeWithAllChoices = FraggedEmpireUtility.buildWeaponTypeWithAllChoices();
        break;
      case "variation":
        context.variationTypeChoices = FraggedEmpireUtility.buildVariationTypeChoices();
        context.weaponTypeWithAllChoices = FraggedEmpireUtility.buildWeaponTypeWithAllChoices();
        break;
      case "trait":
        context.traitTypeChoices = FraggedEmpireUtility.buildTraitTypeChoices();
        break;
      case "tradegood":
        context.tradeGoodTypeChoices = FraggedEmpireUtility.buildTradeGoodTypeChoices();
        break;
      case "perk":
        context.perkTypeChoices = FraggedEmpireUtility.buildPerkTypeChoices();
        break;
      case "spacecraftperk":
        context.spacecraftPerkTypeChoices = FraggedEmpireUtility.buildSpacecraftPerkTypeChoices();
        break;
      case "spacecrafttrait":
        context.spacecraftTraitTypeChoices = FraggedEmpireUtility.buildSpacecraftTraitTypeChoices();
        break;
      case "complication":
        context.complicationTypeChoices = FraggedEmpireUtility.buildComplicationTypeChoices();
        break;
      case "research":
        context.researchGainChoices = FraggedEmpireUtility.buildResearchGainChoices();
        break;
      case "spacecraftweapon":
        context.weaponTypeChoices = FraggedEmpireUtility.buildWeaponTypeChoices();
        context.defaultSkillChoices = this.#buildDefaultSkillChoices(context.combatSkills);
        break;
      case "outfit":
        break;
    }

    // Enrich HTML for prose-mirror collapsed display
    const enrichOptions = { async: true, relativeTo: item };
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "", enrichOptions);
    context.enrichedRequirements = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.requirements ?? "", enrichOptions);
    context.enrichedBenefits = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.benefits ?? "", enrichOptions);
    context.enrichedDisadvantages = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.disadvantages ?? "", enrichOptions);
    context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.gmnotes ?? "", enrichOptions);

    return context;
  }

  /* -------------------------------------------- */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */
  /**
   * Save scroll position before re-render so we can restore it after.
   * The V2 scrollable mechanism sometimes loses position due to tab activation
   * and layout recalculation in _onRender.
   */
  async _preRender(context, options) {
    await super._preRender(context, options);
    const sheetBody = this.element?.querySelector('.sheet-body');
    this._savedScrollTop = sheetBody?.scrollTop ?? 0;
  }

  /* -------------------------------------------- */
  _onRender(context, options) {
    super._onRender(context, options);

    // V2 DragDrop: manually create and bind (V2 has no built-in dragDrop infrastructure)
    new DragDrop.implementation({
      dropSelector: null,
      permissions: {
        drop: this._canDragDrop.bind(this)
      },
      callbacks: {
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);

    // Activate tabs after render (V2 does not auto-activate from tabGroups)
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      if (!tab) continue;
      this.changeTab(tab, group, {force: true});
    }

    // Restore scroll position after layout is complete
    requestAnimationFrame(() => {
      const sheetBody = this.element?.querySelector('.sheet-body');
      if (sheetBody && this._savedScrollTop) {
        sheetBody.scrollTop = this._savedScrollTop;
      }
    });

    // Keyword add dropdown listener
    const addSelect = this.element?.querySelector('.fe2-keyword-add-select');
    if (addSelect) {
      addSelect.addEventListener('change', (event) => {
        event.stopPropagation();
        this.#onAddKeyword(event);
      });
    }

    // Keyword param input listeners
    for (const input of this.element?.querySelectorAll('.fe2-keyword-param') ?? []) {
      input.addEventListener('change', (event) => {
        event.stopPropagation();
        this.#onUpdateKeywordParam(event);
      });
    }
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  static #onPostItem(event, target) {
    this.#postItemToChat();
  }

  /* -------------------------------------------- */
  static #onViewVariation(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.#viewEmbeddedItem("variations", itemId);
  }

  /* -------------------------------------------- */
  static #onViewModification(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.#viewEmbeddedItem("modifications", itemId);
  }

  /* -------------------------------------------- */
  static #onViewTrait(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.#viewEmbeddedItem("traits", itemId);
  }

  /* -------------------------------------------- */
  static async #onDeleteEmbedded(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const itemType = itemRow.dataset.itemType;
    const array = foundry.utils.deepClone(this.document.system[itemType]);
    const newArray = array.filter(item => item._id !== itemId);
    await this.document.update({ [`system.${itemType}`]: newArray });
    // Recompute statstotal after removing a variation/modification
    if (itemType === "variations" || itemType === "modifications") {
      const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(this.document);
      if (Object.keys(statUpdates).length) await this.document.update(statUpdates);
    }
  }

  /* -------------------------------------------- */
  /*  Effect Action Handlers                      */
  /* -------------------------------------------- */

  static #onCreateEffect(event, target) {
    const effectData = {
      name: game.i18n.localize("FE2.Effects.UI.AddEffect"),
      img: "icons/svg/aura.svg",
      origin: this.document.uuid,
      transfer: true,
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

  /* -------------------------------------------- */
  /*  Keyword Action Handlers                     */
  /* -------------------------------------------- */

  static #onRemoveKeyword(event, target) {
    const tagEl = target.closest('.fe2-keyword-tag');
    if (!tagEl) return;
    const index = parseInt(tagEl.dataset.keywordIndex);
    const keywords = foundry.utils.deepClone(this.document.system.keywords || []);
    keywords.splice(index, 1);
    this.document.update({ "system.keywords": keywords });
  }

  #onAddKeyword(event) {
    const select = event.currentTarget;
    const keywordId = select.value;
    if (!keywordId) return;
    const keywords = foundry.utils.deepClone(this.document.system.keywords || []);
    keywords.push({ id: keywordId });
    this.document.update({ "system.keywords": keywords });
  }

  #onUpdateKeywordParam(event) {
    const input = event.currentTarget;
    const tagEl = input.closest('.fe2-keyword-tag');
    if (!tagEl) return;
    const index = parseInt(tagEl.dataset.keywordIndex);
    const paramKey = input.dataset.paramKey;
    const keywords = foundry.utils.deepClone(this.document.system.keywords || []);
    if (keywords[index]) {
      keywords[index][paramKey] = input.value;
      this.document.update({ "system.keywords": keywords });
    }
  }

  /* -------------------------------------------- */
  /*  Private Helpers                             */
  /* -------------------------------------------- */

  /**
   * Post the item details to chat.
   */
  #postItemToChat() {
    const item = this.document;
    let chatData = foundry.utils.deepClone(item.toObject());
    if (item.actor) {
      chatData.actor = { id: item.actor.id };
    }
    if (chatData.img?.includes("/blank.png")) {
      chatData.img = null;
    }
    chatData.jsondata = JSON.stringify({
      compendium: "postedItem",
      payload: chatData
    });

    foundry.applications.handlebars.renderTemplate("systems/foundry-fe2/templates/post-item.html", chatData).then(html => {
      let chatOptions = FraggedEmpireUtility.chatDataSetup(html);
      chatOptions.flags = { "foundry-fe2": { itemData: chatData } };
      ChatMessage.create(chatOptions);
    });
  }

  /* -------------------------------------------- */
  /**
   * View an embedded sub-item (variation, modification, or trait) stored in system arrays.
   * @param {string} arrayName  The system property name ("variations", "modifications", or "traits")
   * @param {string} itemId     The _id of the embedded item
   */
  async #viewEmbeddedItem(arrayName, itemId) {
    const itemData = this.document.system[arrayName]?.find(item => item._id === itemId);
    if (!itemData) return;
    const tempItem = await Item.create(itemData, { temporary: true });
    tempItem.sheet.render(true);
  }

  /* -------------------------------------------- */
  /**
   * Build a choices object from combat skills for default skill select.
   * @param {Array} combatSkills
   * @returns {Object}
   */
  #buildDefaultSkillChoices(combatSkills) {
    const choices = {};
    for (const skill of combatSkills) {
      choices[skill.name] = skill.name;
    }
    return choices;
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /**
   * Skip schema validation in _prepareSubmitData — our item data model
   * handles validation at the document level. This lets the base V2 flow
   * handle prose-mirror and all form elements correctly.
   * Also merges statstotal computation into the same update to avoid
   * double-render (which would break scroll position preservation).
   */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = this._processFormData(event, form, formData);
    if (updateData) {
      foundry.utils.mergeObject(submitData, updateData, {performDeletions: true});
      foundry.utils.mergeObject(submitData, updateData, {performDeletions: false});
    }
    // Merge statstotal computation into the same update (single render cycle).
    // submitData is nested (from expandObject), but computeItemStatsTotals expects
    // flat dot-notation keys — flatten before passing.
    if (this.document.system.stats) {
      const flatData = foundry.utils.flattenObject(submitData);
      const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(this.document, flatData);
      Object.assign(submitData, statUpdates);
    }
    return submitData;
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  /** Type-correct variation/modification mapping per parent item type */
  static VARIATION_TYPES = {
    weapon: { variation: "variation", modification: "modification" },
    outfit: { variation: "variationoutfit", modification: "modificationoutfit" },
    spacecraftweapon: { variation: "spacecraftweaponvariation", modification: "spacecraftweaponmodification" }
  };

  async _onDrop(event) {
    const item = this.document;
    let data;
    try {
      data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    } catch (e) {
      console.error("FE2 | _onDrop: failed to parse drag event data", e);
      return;
    }
    if (!data?.uuid) return;
    let droppedItem;
    try {
      droppedItem = await fromUuid(data.uuid);
    } catch (e) {
      console.error("FE2 | _onDrop: failed to resolve UUID", data.uuid, e);
      return;
    }
    if (!droppedItem) return;

    // Skill: accept trait drops
    if (item.type === "skill") {
      if (droppedItem.type === "trait") {
        const traitArray = foundry.utils.deepClone(item.system.traits);
        const newItem = foundry.utils.deepClone(droppedItem.toObject());
        newItem._id = foundry.utils.randomID();
        traitArray.push(newItem);
        await item.update({ "system.traits": traitArray });
      }
      return;
    }

    // Stat items: accept type-correct variations/modifications
    const typeMap = FraggedEmpireItemSheet.VARIATION_TYPES[item.type];
    if (typeMap) {
      try {
        if (droppedItem.type === typeMap.variation) {
          // Enforce max 1 variation
          if (item.system.variations.length >= 1) {
            ui.notifications.warn(game.i18n.localize("FE2.Items.Common.VariationLimitReached"));
            return;
          }
          const variationsArray = foundry.utils.deepClone(item.system.variations);
          const newItem = foundry.utils.deepClone(droppedItem.toObject());
          newItem._id = foundry.utils.randomID();
          variationsArray.push(newItem);
          await item.update({ "system.variations": variationsArray });
          // Recompute statstotal
          const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(item);
          if (Object.keys(statUpdates).length) await item.update(statUpdates);
        } else if (droppedItem.type === typeMap.modification) {
          const modsArray = foundry.utils.deepClone(item.system.modifications);
          const newItem = foundry.utils.deepClone(droppedItem.toObject());
          newItem._id = foundry.utils.randomID();
          modsArray.push(newItem);
          await item.update({ "system.modifications": modsArray });
          // Recompute statstotal
          const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(item);
          if (Object.keys(statUpdates).length) await item.update(statUpdates);
        }
      } catch (e) {
        console.error("FE2 | _onDrop: error processing drop", e);
        ui.notifications.error("Failed to add item: " + e.message);
      }
      return;
    }
  }
}
