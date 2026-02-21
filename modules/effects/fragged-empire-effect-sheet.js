/**
 * Custom ActiveEffect configuration sheet for Fragged Empire 2E.
 * Overrides the Changes tab to show categorized target type dropdowns.
 */

import { EFFECT_CATEGORIES, EFFECT_TARGET_TYPES, CHARACTER_ATTRIBUTES, SPACECRAFT_ATTRIBUTES, parseEffectKey, buildEffectKey } from "./fragged-empire-effect-types.js";
import { FraggedEmpireUtility } from "../fragged-empire-utility.js";

export class FraggedEmpireEffectSheet extends foundry.applications.sheets.ActiveEffectConfig {

  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    classes: ["foundry-fe2", "active-effect"],
    position: { width: 620, height: 520 },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      addChange: FraggedEmpireEffectSheet.#onAddChange,
      deleteChange: FraggedEmpireEffectSheet.#onDeleteChange
    }
  };

  /* -------------------------------------------- */
  static PARTS = {
    ...super.PARTS,
    details: {
      template: "systems/foundry-fe2/templates/effects/effect-details-tab.html",
      scrollable: [".tab"]
    },
    changes: {
      template: "systems/foundry-fe2/templates/effects/effect-changes-tab.html",
      scrollable: [".effect-changes-list"]
    }
  };

  /* -------------------------------------------- */
  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    delete parts.footer;
    return parts;
  }

  /* -------------------------------------------- */
  static TABS = {
    sheet: {
      tabs: [
        { id: "details", icon: "fa-solid fa-book", label: "FE2.Effects.ConfigTabs.Details" },
        { id: "duration", icon: "fa-solid fa-clock", label: "FE2.Effects.ConfigTabs.Duration" },
        { id: "changes", icon: "fa-solid fa-gears", label: "FE2.Effects.ConfigTabs.Changes" }
      ],
      initial: "details"
    }
  };

  /* -------------------------------------------- */
  /** @override */
  async _preRender(context, options) {
    await super._preRender(context, options);
    // Save scroll positions for all tabs before re-render
    this._savedScrollPositions = {};
    this.element?.querySelectorAll('.tab[data-group="sheet"]').forEach(tab => {
      if (tab.scrollTop > 0) {
        this._savedScrollPositions[tab.dataset.tab] = tab.scrollTop;
      }
    });
  }

  /* -------------------------------------------- */
  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Manually sync tab active states (core V2 layer CSS may not apply reliably)
    const activeTab = this.tabGroups?.sheet ?? "details";
    this.element.querySelectorAll('.sheet-tabs [data-tab]')
      .forEach(el => el.classList.toggle("active", el.dataset.tab === activeTab));
    this.element.querySelectorAll('.tab[data-group="sheet"]')
      .forEach(el => el.classList.toggle("active", el.dataset.tab === activeTab));

    // Restore scroll positions after layout is complete
    requestAnimationFrame(() => {
      if (this._savedScrollPositions) {
        this.element?.querySelectorAll('.tab[data-group="sheet"]').forEach(tab => {
          const saved = this._savedScrollPositions[tab.dataset.tab];
          if (saved) tab.scrollTop = saved;
        });
      }
    });
  }

  /* -------------------------------------------- */
  /** @override */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    const target = event.target;
    if (!target?.matches(".effect-field-target")) return;

    const targetType = target.value;
    const row = target.closest(".effect-change-entry");
    if (!row) return;

    const skillSel = row.querySelector(".effect-field-skill");
    const attrSel = row.querySelector(".effect-field-attribute");

    // Show skill dropdown for skill, toolbox, and workshop types
    const showSkill = (targetType === EFFECT_TARGET_TYPES.skill || targetType === EFFECT_TARGET_TYPES.skillToolbox || targetType === EFFECT_TARGET_TYPES.skillWorkshop);
    if (skillSel) {
      skillSel.style.display = showSkill ? "" : "none";
      if (!showSkill) skillSel.value = "";
    }

    // Show attribute dropdown for "attribute" and "attributeMax" types
    if (attrSel) {
      const showAttr = (targetType === EFFECT_TARGET_TYPES.attribute || targetType === EFFECT_TARGET_TYPES.attributeMax);
      attrSel.style.display = showAttr ? "" : "none";
      if (!showAttr) attrSel.value = "";
    }
  }

  /* -------------------------------------------- */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    if (partId === "details") {
      const enrichOptions = { async: true, relativeTo: this.document };
      context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.description ?? "", enrichOptions
      );
    }

    if (partId === "changes") {
      context.targetTypeOptions = EFFECT_CATEGORIES;
      context.skillOptions = this._getSkillOptions();
      context.attributeOptions = this._getAttributeOptions();
      context.changes = this._prepareChangesContext();
    }

    return context;
  }

  /* -------------------------------------------- */
  /**
   * Parse existing effect changes back into target type + subtype for display.
   * @returns {Array<object>}
   */
  _prepareChangesContext() {
    const changes = this.document.changes || [];
    return changes.map((change, idx) => {
      const parsed = parseEffectKey(change.key);
      let targetType = parsed?.targetType ?? "";
      let targetId = parsed?.targetId ?? "";

      // Map allSkills back to skill + "all" for the UI (allSkills is a subtype
      // option under "Skill" in the dropdown, not a separate target type entry)
      if (targetType === EFFECT_TARGET_TYPES.allSkills) {
        targetType = EFFECT_TARGET_TYPES.skill;
        targetId = "all";
      }

      return {
        key: change.key,
        value: change.value,
        mode: change.mode,
        targetType,
        targetId
      };
    });
  }

  /* -------------------------------------------- */
  /**
   * Build skill options from the compendium cache.
   * @returns {Array<{value: string, label: string}>}
   */
  _getSkillOptions() {
    const skills = FraggedEmpireUtility.compendiumSkills || [];
    return skills.map(s => ({ value: s._id, label: s.name }));
  }

  /* -------------------------------------------- */
  /**
   * Build attribute options based on the parent actor type.
   * @returns {Array<{value: string, label: string}>}
   */
  _getAttributeOptions() {
    const parent = this.document.parent;
    const isSpacecraft = parent?.type === "spacecraft";
    const attrs = isSpacecraft ? SPACECRAFT_ATTRIBUTES : CHARACTER_ATTRIBUTES;
    const prefix = isSpacecraft ? "FE2.SpacecraftAttr." : "FE2.Attributes.";

    return attrs.map(key => ({
      value: key,
      label: game.i18n.localize(prefix + key.charAt(0).toUpperCase() + key.slice(1))
    }));
  }

  /* -------------------------------------------- */
  _prepareSubmitData(event, form, formData) {
    const data = super._prepareSubmitData(event, form, formData);

    // Convert our custom form fields back into standard changes array
    const changesEls = this.element.querySelectorAll(".effect-change-entry");
    const changes = [];

    for (const el of changesEls) {
      const targetType = el.querySelector("[data-field='targetType']")?.value || "";
      const mode = Number(el.querySelector("[data-field='mode']")?.value) || 2;
      const value = el.querySelector("[data-field='value']")?.value || "0";

      // Get the appropriate target ID based on target type
      let targetId = null;
      if (targetType === EFFECT_TARGET_TYPES.skill || targetType === EFFECT_TARGET_TYPES.skillToolbox || targetType === EFFECT_TARGET_TYPES.skillWorkshop) {
        targetId = el.querySelector("[data-field='skillId']")?.value || null;
      } else if (targetType === EFFECT_TARGET_TYPES.attribute || targetType === EFFECT_TARGET_TYPES.attributeMax) {
        targetId = el.querySelector("[data-field='attributeId']")?.value || null;
      }

      if (targetType) {
        const key = buildEffectKey(targetType, targetId);
        if (key) changes.push({ key, value, mode });
      }
    }

    data.changes = changes;
    return data;
  }

  /* -------------------------------------------- */
  /*  Action Handlers                              */
  /* -------------------------------------------- */

  static #onAddChange(event, target) {
    const changes = foundry.utils.deepClone(this.document.changes || []);
    changes.push({ key: "", value: "0", mode: 2 });
    this.document.update({ changes });
  }

  static #onDeleteChange(event, target) {
    const idx = Number(target.dataset.index);
    const changes = foundry.utils.deepClone(this.document.changes || []);
    changes.splice(idx, 1);
    this.document.update({ changes });
  }
}
