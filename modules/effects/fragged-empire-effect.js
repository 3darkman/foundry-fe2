/**
 * Custom ActiveEffect document class for Fragged Empire 2E.
 * Adds suppression awareness and origin item resolution.
 */

import { isEquipSuppressed } from "./fragged-empire-effect-helpers.js";

export class FraggedEmpireEffect extends ActiveEffect {

  /**
   * Whether this effect is conditional (excluded from sheet, shown in roll dialogs).
   * @type {boolean}
   */
  get isConditional() {
    return !!this.getFlag('foundry-fe2', 'conditional');
  }

  /**
   * Whether this effect is suppressed (e.g., origin item is unequipped).
   * @type {boolean}
   */
  get isSuppressed() {
    if (!(this.parent instanceof Actor)) return false;
    return isEquipSuppressed(this, this.parent);
  }

  /**
   * Resolve the source Item document from this effect's origin.
   * @type {Item|null}
   */
  get originItem() {
    if (!this.origin || !(this.parent instanceof Actor)) return null;
    const originId = this.origin.split(".").pop();
    return this.parent.items.get(originId) ?? null;
  }
}
