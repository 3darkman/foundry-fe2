import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

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
      deleteEmbedded: FraggedEmpireItemSheet.#onDeleteEmbedded
    },
    dragDrop: [{ dragSelector: null, dropSelector: null }]
  };

  /* -------------------------------------------- */
  static PARTS = {
    body: { template: "systems/foundry-fe2/templates/item-skill-sheet.html" }
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
    context.keywords = FraggedEmpireUtility.split3Columns(itemData.system.keywords);
    context.optionsBase = FraggedEmpireUtility.createDirectOptionList(0, 20);
    context.limited = item.limited;
    context.owner = item.isOwner;
    context.isGM = game.user.isGM;

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
  _onRender(context, options) {
    super._onRender(context, options);
    // Item templates use .tab class for content wrapper — activate it so content is visible
    this.element.querySelectorAll(".tab[data-group]").forEach(el => el.classList.add("active"));
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
  static #onDeleteEmbedded(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const itemType = itemRow.dataset.itemType;
    const array = foundry.utils.deepClone(this.document.system[itemType]);
    const newArray = array.filter(item => item._id !== itemId);
    this.document.update({ [`system.${itemType}`]: newArray });
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

  async _onChangeForm(formConfig, event) {
    const form = this.form;
    if (!form) return;
    const formData = new foundry.applications.ux.FormDataExtended(form);
    const data = foundry.utils.expandObject(formData.object);
    await this.document.update(data);
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  async _onDrop(event) {
    const item = this.document;

    if (item.type === "skill") {
      let data;
      try {
        data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      } catch (e) {
        return;
      }
      if (!data?.uuid) return;
      const droppedItem = await fromUuid(data.uuid);
      if (!droppedItem) return;
      if (droppedItem.type === "trait") {
        const traitArray = foundry.utils.deepClone(item.system.traits);
        const newItem = foundry.utils.deepClone(droppedItem.toObject());
        newItem._id = foundry.utils.randomID();
        traitArray.push(newItem);
        await item.update({ "system.traits": traitArray });
      }
      return;
    }

    if (item.type === "weapon" || item.type === "spacecraftweapon" || item.type === "outfit") {
      let data;
      try {
        data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      } catch (e) {
        return;
      }
      if (!data?.uuid) return;
      const droppedItem = await fromUuid(data.uuid);
      if (!droppedItem) return;
      if (droppedItem.type.includes("variation")) {
        const variationsArray = foundry.utils.deepClone(item.system.variations);
        const newItem = foundry.utils.deepClone(droppedItem.toObject());
        newItem._id = foundry.utils.randomID();
        variationsArray.push(newItem);
        await item.update({ "system.variations": variationsArray });
      } else if (droppedItem.type.includes("modification")) {
        const modsArray = foundry.utils.deepClone(item.system.modifications);
        const newItem = foundry.utils.deepClone(droppedItem.toObject());
        newItem._id = foundry.utils.randomID();
        modsArray.push(newItem);
        await item.update({ "system.modifications": modsArray });
      }
      return;
    }

    super._onDrop(event);
  }
}
