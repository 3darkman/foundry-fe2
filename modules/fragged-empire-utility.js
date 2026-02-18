/* -------------------------------------------- */
import { applyModifiers } from "./effects/fragged-empire-effect-helpers.js";

/* -------------------------------------------- */
export class FraggedEmpireUtility  {
  

  /* -------------------------------------------- */
  static async init() {
    Hooks.on('renderChatLog', (log, html, data) => FraggedEmpireUtility.chatListeners(html));
  }

  /* -------------------------------------------- */
  static getSkillsCompendiumName() {
    const lang = game.i18n.lang;
    if (lang === "pt-BR") return "foundry-fe2.skills-pt-br";
    return "foundry-fe2.skills";
  }

  /* -------------------------------------------- */
  static async ready() {
    const skills = await FraggedEmpireUtility.loadCompendium(FraggedEmpireUtility.getSkillsCompendiumName());
    this.compendiumSkills  = skills.map(i => i.toObject());
  }

  /* -------------------------------------------- */
  static getSkillsType( skillType ) {
    let filtered = this.compendiumSkills.filter( skill => skill.system.type == skillType );
    return filtered;
  }

  /* -------------------------------------------- */
  static async chatListeners(html) {

    html.addEventListener("click", event => {
      if (event.target.className == 'dice-image-reroll chat-dice') {
        const diceIndex = event.target.parentElement.dataset.diceIndex;
        const actorId = event.target.parentElement.dataset.actorId;
        FraggedEmpireUtility.rerollDice(actorId, diceIndex)
      }
    });
  }
  
  /* -------------------------------------------- */  
  static async preloadHandlebarsTemplates() {
    
    const templatePaths = [
      'systems/foundry-fe2/templates/actor-sheet.html',
      'systems/foundry-fe2/templates/editor-notes-gm.html',
      'systems/foundry-fe2/templates/weapon-stats-section.html',
      'systems/foundry-fe2/templates/variations-section.html',
      'systems/foundry-fe2/templates/modifications-section.html',
      'systems/foundry-fe2/templates/skill-traits-section.html',
      'systems/foundry-fe2/templates/weapon-stats-section-tchat.html',
      'systems/foundry-fe2/templates/partial-skill-list-header.html',
      'systems/foundry-fe2/templates/chat-generic-result.html',
      'systems/foundry-fe2/templates/post-item.html',
      'systems/foundry-fe2/templates/effects-section.html',
      'systems/foundry-fe2/templates/effects/effect-changes-tab.html',
      'systems/foundry-fe2/templates/partial-keywords-section.html',
      'systems/foundry-fe2/templates/partial-item-tabs-nav.html',
      'systems/foundry-fe2/templates/partial-item-stats-vertical.html'
    ]
    return foundry.applications.handlebars.loadTemplates(templatePaths);    
  }

  /* -------------------------------------------- */
  static templateData(it) {
    return FraggedEmpireUtility.data(it)?.system ?? {}
  }

  /* -------------------------------------------- */
  static data(it) {
    if (it instanceof Actor || it instanceof Item || it instanceof Combatant) {
      return it.system;
    }
    return it;
  }

  /* -------------------------------------------- */
  static createDirectOptionList( min, max) {
    let options = {};
    for(let i=min; i<=max; i++) {
      options[`${i}`] = `${i}`;
    }
    return options;
  }

  /* -------------------------------------------- */
  static buildListOptions(min, max) {
    return this.createDirectOptionList(min, max);
  }

  /* -------------------------------------------- */
  // Choice builders for {{selectOptions}} migration
  /* -------------------------------------------- */

  static buildNPCTypeChoices() {
    return {
      henchman: game.i18n.localize("FE2.Sheet.NPC.Henchman"),
      drone: game.i18n.localize("FE2.Sheet.NPC.Drone"),
      companion: game.i18n.localize("FE2.Sheet.NPC.Companion")
    };
  }

  static buildWeaponTypeChoices() {
    return {
      gun: game.i18n.localize("FE2.Items.Types.Gun"),
      shell: game.i18n.localize("FE2.Items.Types.Shell"),
      melee: game.i18n.localize("FE2.Items.Types.Melee"),
      companion: game.i18n.localize("FE2.Items.Types.Companion"),
      special: game.i18n.localize("FE2.Items.Types.Special")
    };
  }

  static buildWeaponTypeWithAllChoices() {
    return {
      all: game.i18n.localize("FE2.Items.Types.All"),
      ...this.buildWeaponTypeChoices()
    };
  }

  static buildModificationTypeChoices() {
    return {
      weapon: game.i18n.localize("FE2.Items.Types.WeaponModification"),
      melee: game.i18n.localize("FE2.Items.Types.MeleeModification"),
      drone: game.i18n.localize("FE2.Items.Types.DroneCompanionModification")
    };
  }

  static buildVariationTypeChoices() {
    return {
      gun: game.i18n.localize("FE2.Items.Types.GunVariation"),
      shell: game.i18n.localize("FE2.Items.Types.ShellVariation"),
      melee: game.i18n.localize("FE2.Items.Types.MeleeVariation"),
      companion: game.i18n.localize("FE2.Items.Types.CompanionVariation"),
      special: game.i18n.localize("FE2.Items.Types.SpecialVariation")
    };
  }

  static buildTraitTypeChoices() {
    return {
      advancement: game.i18n.localize("FE2.Items.Types.Advancement"),
      attribute: game.i18n.localize("FE2.Items.Types.Attribute"),
      primaryskill: game.i18n.localize("FE2.Items.Types.PrimarySkill"),
      personalcombat: game.i18n.localize("FE2.Items.Types.PersonalCombat"),
      spaceshipcombat: game.i18n.localize("FE2.Items.Types.SpaceshipCombat"),
      npc: game.i18n.localize("FE2.Items.Types.NPC")
    };
  }

  static buildTradeGoodTypeChoices() {
    return {
      money: game.i18n.localize("FE2.Items.Types.Money"),
      loot: game.i18n.localize("FE2.Items.Types.Loot"),
      freight: game.i18n.localize("FE2.Items.Types.Freight")
    };
  }

  static buildPerkTypeChoices() {
    return {
      minor: game.i18n.localize("FE2.Items.Perk.Minor"),
      moderate: game.i18n.localize("FE2.Items.Perk.Moderate"),
      major: game.i18n.localize("FE2.Items.Perk.Major")
    };
  }

  static buildComplicationTypeChoices() {
    return {
      minor: game.i18n.localize("FE2.Items.Complication.Minor"),
      moderate: game.i18n.localize("FE2.Items.Complication.Moderate"),
      major: game.i18n.localize("FE2.Items.Complication.Major")
    };
  }

  static buildSpacecraftPerkTypeChoices() {
    return {
      minor: game.i18n.localize("FE2.Items.SpacecraftPerk.Optional"),
      moderate: game.i18n.localize("FE2.Items.SpacecraftPerk.Automatic")
    };
  }

  static buildSpacecraftTraitTypeChoices() {
    return {
      build: game.i18n.localize("FE2.Items.Types.Build"),
      npc: game.i18n.localize("FE2.Items.Types.NPCBuild"),
      hull: game.i18n.localize("FE2.Items.Types.Hull"),
      engines: game.i18n.localize("FE2.Items.Types.Engines"),
      crew: game.i18n.localize("FE2.Items.Types.Crew"),
      power: game.i18n.localize("FE2.Items.Types.Power"),
      cpu: game.i18n.localize("FE2.Items.Types.CPU"),
      sensors: game.i18n.localize("FE2.Items.Types.Sensors"),
      size: game.i18n.localize("FE2.Items.Types.Size")
    };
  }

  static buildResearchGainChoices() {
    return {
      none: game.i18n.localize("FE2.Items.Research.None"),
      secret: game.i18n.localize("FE2.Items.Research.SecretKnowledge"),
      perk: game.i18n.localize("FE2.Items.Research.MinorPerk")
    };
  }

  static buildDifficultyChoices() {
    return {
      "0": game.i18n.localize("FE2.Difficulty.None"),
      "8": game.i18n.localize("FE2.Difficulty.Easy"),
      "12": game.i18n.localize("FE2.Difficulty.Moderate"),
      "16": game.i18n.localize("FE2.Difficulty.Difficult"),
      "18": game.i18n.localize("FE2.Difficulty.VeryDifficult")
    };
  }

  static buildCoverChoices() {
    return {
      "0": game.i18n.localize("FE2.Roll.Cover.NoCover"),
      "1": game.i18n.localize("FE2.Roll.Cover.LightCover"),
      "2": game.i18n.localize("FE2.Roll.Cover.HeavyCover"),
      "3": game.i18n.localize("FE2.Roll.Cover.EntrenchedCover")
    };
  }

  /* -------------------------------------------- */
  static async getTraitFromCompendium( itemId) {
    let trait = game.items.find( item => item.type == 'trait' && item.id == itemId );
    if ( !trait ) {
      let traits = await this.loadCompendium('world.traits', item => item.id == itemId );
      let traitsObj = traits.map(i => i.toObject());
      trait = traitsObj[0];
    } else {
      trait = foundry.utils.deepClone( trait);
    }
    return trait;
  }

  /* -------------------------------------------- */
  static async getTraitAttributeList( attr ) {
    let traits1 = game.items.filter( item => item.type == 'trait' && item.system.subtype == attr );
    let traits2 = await this.loadCompendium('world.traits', item => item.type == 'trait' && item.system.subtype == attr );
    return traits1.concat( traits2);
  }

  /* -------------------------------------------- */
  static onSocketMesssage( msg ) {
    if( !game.user.isGM ) return; // Only GM

    if (msg.name == 'msg_attack' ) {
      this.performAttack( msg.data );
    }
  }

  /* -------------------------------------------- */
  static chatDataSetup(content, modeOverride, isRoll = false, forceWhisper) {
    let chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content: content
    };

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (chatData.rollMode === "blindroll") chatData["blind"] = true;
    else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

    if (forceWhisper) { // Final force !
      chatData["speaker"] = ChatMessage.getSpeaker();
      chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
    }

    return chatData;
  }
  
  /* -------------------------------------------- */
  static async loadCompendiumData(compendium) {
    const pack = game.packs.get(compendium);
    return await pack?.getDocuments() ?? [];
  }

  /* -------------------------------------------- */
  static async loadCompendium(compendium, filter = item => true) {
    let compendiumData = await this.loadCompendiumData(compendium);
    return compendiumData.filter(filter);
  }
  
  /* -------------------------------------------- */
  static async showDiceSoNice(roll, rollMode) {
    if (game.modules.get("dice-so-nice")?.active) {
      if (game.dice3d) {
        let whisper = null;
        let blind = false;
        rollMode = rollMode ?? game.settings.get("core", "rollMode");
        switch (rollMode) {
          case "blindroll": //GM only
            blind = true;
          case "gmroll": //GM + rolling player
            whisper = this.getUsers(user => user.isGM);
            break;
          case "roll": //everybody
            whisper = this.getUsers(user => user.active);
            break;
          case "selfroll":
            whisper = [game.user.id];
            break;
        }
        await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
      }
    }
  }


  /* -------------------------------------------- */
   static async rollFraggedEmpire( rollData ) {

    let skillLevel = rollData.skill?.system.total ||  0;
    let nbDice = 3;

    // Apply skill effect modifiers
    if (rollData.effectModifiers) {
      const mods = rollData.effectModifiers;
      const skillId = rollData.skill?.id;
      const skillMods = [...(mods.skills[skillId] || []), ...(mods.skills.all || [])];
      if (skillMods.length) {
        skillLevel = Math.round(applyModifiers(skillLevel, skillMods));
      }
      if (rollData.skill && !rollData.skill.system.trained && rollData.untrainedSkillMod) {
        skillLevel += rollData.untrainedSkillMod;
      }
    }

    // Bonus/Malus total
    rollData.weaponHit = 0;
    rollData.finalBM = rollData.bonusMalus;
    if (rollData.acquisitionMod) rollData.finalBM += rollData.acquisitionMod;
    if (rollData.isArcane) {
      let arcanePenalty = 2 + (rollData.arcaneMod || 0);
      if (arcanePenalty < 0) arcanePenalty = 0;
      rollData.finalBM -= arcanePenalty;
    }
    if ( rollData.useToolbox) rollData.finalBM += 1;
    if ( rollData.useDedicatedworkshop) rollData.finalBM += 2;
    if ( rollData.mode == 'weapon' || rollData.mode == 'spacecraftweapon') {
      rollData.rofValue = (rollData.rofValue < 1) ? 1 : Number(rollData.rofValue);
      rollData.weaponHit = Number(rollData.weapon.system.statstotal.hit.value) + (rollData.effectHitBonus || 0);
      nbDice = Number(rollData.weapon.system.statstotal.hitdice.value.substring(0,1));
    }

    if ( rollData.bMHitDice ) {
      nbDice = nbDice + rollData.bMHitDice 
    }
    if ( rollData.mode == 'npcfight' ) {
      rollData.rofValue = (rollData.rofValue < 1) ? 1 : Number(rollData.rofValue);
      rollData.weaponHit = Number(rollData.npcstats.hit.value);
      rollData.rofBonus = rollData.rofValue - 1;
      nbDice += rollData.rofBonus;
    }
    let myRoll = rollData.roll;
    if ( !myRoll ) { // New rolls only of no rerolls
      let formula = nbDice+"d6+"+rollData.weaponHit+"+"+rollData.finalBM+"+"+skillLevel;
      myRoll = new Roll(formula);
      await myRoll.evaluate();
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode") );
      rollData.roll = myRoll
      rollData.nbStrongHitUsed = 0;
    }
    
    let minStrongHit = 6;
    let maxStrongHit = 6;
    if (rollData.weapon) {
      const keywords = Array.isArray(rollData.weapon.system.keywords) ? rollData.weapon.system.keywords : [];
      const strongHit = keywords.find(k => k.id === "stronghit");
      if (strongHit) {
        minStrongHit = Number(strongHit.X) || 6;
        maxStrongHit = Number(strongHit.Y) || 6;
      }
    }
    rollData.diceResults = [];
    let nbStrongHit = 0;
    rollData.rollTotal  = 0;
    for (let i=0; i< nbDice; i++) {
      rollData.diceResults[i] = myRoll.dice[0].results[i].result
      if ( myRoll.dice[0].results[i].result >= minStrongHit && myRoll.dice[0].results[i].result <= maxStrongHit) {
        nbStrongHit++;
      }
      rollData.rollTotal += Number(myRoll.dice[0].results[i].result); // Update result
    }
    rollData.rollTotal += Number(rollData.weaponHit) + Number(rollData.finalBM) + Number(skillLevel);

    // Stockage resultats
    rollData.nbStrongHit = nbStrongHit;
    rollData.nbDice = nbDice;
    if ( rollData.mode == "skill" || rollData.mode == "genericskill") {
      rollData.strongHitAvailable = ( rollData.nbStrongHitUsed < rollData.nbStrongHit);
    } else {
      rollData.strongHitAvailable = true;
    }
    let actor = game.actors.get(rollData.actorId);
    switch (actor.type) {
      case "npc":
        rollData.endDmgAdd = Number(actor.system.stats.Attribute.value)
        break;
      case "character":
        rollData.endDmgAdd = Number(actor.system.attributes.focus.current)
        break;
      case "spacecraft":
        rollData.endDmgAdd = Number(actor.system.attributes.sensors.current)
        break;
    }
    if (rollData.mode != "skill" && rollData.mode != "genericskill") {
      if (rollData.hasGrit != false) {
        switch (actor.type) {
          case "character":
            rollData.gritRerollsLeft = actor.system.gritreroll.value
            rollData.gritRerollsMax = actor.system.gritreroll.max
            break;
          case "spacecraft":
            rollData.gritRerollsLeft = actor.system.fight.gritreroll.value
            rollData.gritRerollsMax = 2
            break;
        }
      }
      if (rollData.target.type == "npc"){
        rollData.targetDefence = (rollData.target._computed?.defence ?? rollData.target.system.fight.defence.value) + (rollData.intmod * rollData.cover)
        rollData.targetArmor = rollData.target._computed?.armour ?? rollData.target.system.fight.armour.value
        rollData.targetEnd = rollData.target._computed?.endurance ?? rollData.target.system.fight.endurance.value
        rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.enddmg.value) + Number(actor.system.attributes.focus.current) + (rollData.effectEndDmg || 0)
        rollData.critDmg = rollData.weapon.system.statstotal.crit.value - (rollData.target._computed?.armour ?? rollData.target.system.fight.armour.value)
      } else if (rollData.target.type == "spacecraft") {
        rollData.targetDefence = rollData.target.system.fight.defence.total
        rollData.targetArmor = rollData.target.system.fight.armour.total
        rollData.targetEnd = rollData.target.system.fight.shield.total
        rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.shielddmg.value) + rollData.endDmgAdd + (rollData.effectEndDmg || 0)
        rollData.critDmg = rollData.weapon.system.statstotal.crit.value - rollData.target.system.fight.armour.total
      } else {
        rollData.targetDefence = rollData.target.system.defensebonus.total + (rollData.intmod * rollData.cover)
        rollData.targetArmor = rollData.target.system.armourbonus.total
        rollData.targetEnd = rollData.target.system.endurance.value
        rollData.critDmg = rollData.weapon.system.statstotal.crit.value - rollData.target.system.armourbonus.total
        rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.enddmg.value) + rollData.endDmgAdd + (rollData.effectEndDmg || 0)
      }
    }
    
    actor.saveRollData( rollData );

    if (game.modules.get("sequencer")?.active && game.modules.get("JB2A_DnD5e")?.active && rollData.mode != "skill" && rollData.mode != "genericskill") {
      const fxSource = canvas.tokens.controlled[0]
      const fxTarget = game.user.targets.first();

      new Sequence()
        .effect()
            .file("jb2a.bullet")
            .attachTo(fxSource)
            .stretchTo(fxTarget, { attachTo: true })
        .play()
    }

    if (rollData.mode != "skill" && rollData.mode != "genericskill") {
      if (rollData.mode == "weapon" && rollData.useMunitions) {
        rollData.munitionsUsed = 1;
      }
      if (rollData.munitionsUsed != 0) {
        if (rollData.mode == "spacecraftweapon") {
          actor.updateShipMunitions(rollData.actorId, rollData.munitionsUsed);
        } else {
          actor.updateWeaponMunitions(rollData.weapon._id, rollData.munitionsUsed);
        }
      }
    }

    let chatRollFlags = FraggedEmpireUtility.buildRollChatFlags(rollData);
    this.createChatWithRollMode( rollData.alias, {
      content: await foundry.applications.handlebars.renderTemplate(`systems/foundry-fe2/templates/chat-generic-result.html`, rollData),
      flags: { "foundry-fe2": { rollData: chatRollFlags } }
    });

    if (rollData.mode != "skill" && rollData.mode != "genericskill") {
      if (rollData.target.type == "npc"){
        if (rollData.weapon.system.statstotal.crit.value >= rollData.target.system.fight.durability.value) { }
      } else { if (rollData.target.type == "spacecraft") {
        if (rollData.weapon.system.statstotal.shielddmg.value >= rollData.target.system.fight.shield.total || rollData.nbStrongHit > 0) {
          let table = game.tables.find( t => t.name === 'Spacecraft Hit Location' );
          let draw = await table.draw();
        }
        } else { 
          if (rollData.totalEndDmg >= rollData.target.system.endurance.value) {
            let table = game.tables.find( t => t.name === 'Hit Location' );
            let draw = await table.draw();
          }
        }
      }
    }
  }
  /* -------------------------------------------- */
  static async rerollDice( actorId, diceIndex=-1 ) {
    let actor = game.actors.get(actorId);
    let rollData = actor.getRollData();
    

    if ( diceIndex != -1) {
      let myRoll = new Roll("1d6");
      await myRoll.evaluate();
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode") );

      rollData.roll.dice[0].results[diceIndex].result = myRoll.total; // Patch
      rollData.gritreroll= actor.decrementGritRerolls();
    } else {
      rollData.gritRerollsLeft = actor.decrementGritRerolls();
      rollData.roll = undefined;
    }
    rollData.nbStrongHitUsed++
    this.rollFraggedEmpire( rollData );
  }

  /* -------------------------------------------- */
  static getUsers(filter) {
    return game.users.filter(filter).map(user => user.id);
  }
  /* -------------------------------------------- */
  static getWhisperRecipients(rollMode, name) {
    switch (rollMode) {
      case "blindroll": return this.getUsers(user => user.isGM);
      case "gmroll": return this.getWhisperRecipientsAndGMs(name);
      case "selfroll": return [game.user.id];
    }
    return undefined;
  }
  /* -------------------------------------------- */
  static getWhisperRecipientsAndGMs(name) {
    let recep1 = ChatMessage.getWhisperRecipients(name) || [];
    return recep1.concat(ChatMessage.getWhisperRecipients('GM'));
  }

  /* -------------------------------------------- */
  static blindMessageToGM(chatOptions) {
    let chatGM = foundry.utils.deepClone(chatOptions);
    chatGM.whisper = this.getUsers(user => user.isGM);
    chatGM.content = game.i18n.format("FE2.Chat.Results.BlindMessage", {name: game.user.name}) + "<br>" + chatOptions.content;
    game.socket.emit("system.foundry-fe2", { msg: "msg_gm_chat_message", data: chatGM });
  }

  /* -------------------------------------------- */
  static buildRoFArray( item ) {
    if (item.type != "weapon") return false;
    
    let rofMax = Number(item.system.statstotal.rof.value) || 1;
    return this.createDirectOptionList(1, rofMax);
  }

  /* -------------------------------------------- */
  static buildRollChatFlags(rollData) {
    let flags = {
      mode: rollData.mode,
      actorId: rollData.actorId,
      actorImg: rollData.actorImg,
      alias: rollData.alias,
      diceResults: rollData.diceResults.slice(),
      strongHitAvailable: rollData.strongHitAvailable,
      nbStrongHit: rollData.nbStrongHit,
      nbStrongHitUsed: rollData.nbStrongHitUsed,
      finalBM: rollData.finalBM,
      difficulty: rollData.difficulty,
      rollTotal: rollData.rollTotal,
      targetDefence: rollData.targetDefence,
      targetArmor: rollData.targetArmor,
      targetEnd: rollData.targetEnd,
      totalEndDmg: rollData.totalEndDmg,
      critDmg: rollData.critDmg,
      gritRerollsLeft: rollData.gritRerollsLeft,
      gritRerollsMax: rollData.gritRerollsMax
    };
    if (rollData.skill) {
      flags.skill = { name: rollData.skill.name, system: { total: rollData.skill.system.total } };
    }
    if (rollData.weapon) {
      flags.weapon = {
        name: rollData.weapon.name,
        system: { statstotal: {
          hit: { value: rollData.weapon.system.statstotal.hit.value },
          crit: { value: rollData.weapon.system.statstotal.crit.value }
        }}
      };
    }
    if (rollData.target) {
      flags.target = { name: rollData.target.name, img: rollData.target.img, type: rollData.target.type };
    }
    if (rollData.npc) {
      flags.npc = { name: rollData.npc.name };
    }
    if (rollData.npcstats) {
      flags.npcstats = { hit: { value: rollData.npcstats.hit.value } };
    }
    return flags;
  }

  /* -------------------------------------------- */
  static createChatMessage(name, rollMode, chatOptions) {
    switch (rollMode) {
      case "blindroll": // GM only
        if (!game.user.isGM) {
          this.blindMessageToGM(chatOptions);

          chatOptions.whisper = [game.user.id];
          chatOptions.content = game.i18n.localize("FE2.Chat.Results.GMOnly");
          if (chatOptions.flags) delete chatOptions.flags["foundry-fe2"];
        }
        else {
          chatOptions.whisper = this.getUsers(user => user.isGM);
        }
        break;
      default:
        chatOptions.whisper = this.getWhisperRecipients(rollMode, name);
        break;
    }
    chatOptions.alias = chatOptions.alias || name;
    ChatMessage.create(chatOptions);
  }

  /* -------------------------------------------- */
  static createChatWithRollMode(name, chatOptions) {
    this.createChatMessage(name, game.settings.get("core", "rollMode"), chatOptions);
  }

  /* -------------------------------------------- */
  static buildDifficultyOptions( ) {
    return this.buildDifficultyChoices();
  }
  
  /* -------------------------------------------- */
  /**
   * Categorize actor effects into Passive, Temporary, and Inactive groups.
   * @param {Actor} actor
   * @returns {Object} Categories with label and effects array
   */
  static categorizeEffects(actor) {
    const passive = [];
    const temporary = [];
    const inactive = [];

    for (const effect of actor.effects) {
      const d = {
        _id: effect.id,
        name: effect.name,
        img: effect.img,
        tint: effect.tint ?? "#ffffff",
        disabled: effect.disabled,
        duration: effect.duration,
        active: !effect.disabled && !effect.isSuppressed,
        isSuppressed: effect.isSuppressed,
        sourceName: effect.originItem?.name ?? "",
        effect: effect
      };

      if (effect.disabled || effect.isSuppressed) {
        inactive.push(d);
      } else if (effect.duration?.rounds || effect.duration?.seconds || effect.duration?.turns) {
        temporary.push(d);
      } else {
        passive.push(d);
      }
    }

    return {
      passive: { label: "FE2.Effects.Categories.Passive", effects: passive },
      temporary: { label: "FE2.Effects.Categories.Temporary", effects: temporary },
      inactive: { label: "FE2.Effects.Categories.Inactive", effects: inactive }
    };
  }

  /* -------------------------------------------- */
  /**
   * Compute statstotal for an item from its base stats + variation + modification stats.
   * Returns a flat update object like { "system.statstotal.hitdice.value": "3", ... }.
   * @param {Item} item             The item document (weapon, outfit, spacecraftweapon, or utility)
   * @param {Object} pendingChanges Optional flat object of pending form changes (e.g. {"system.stats.hitdice.value": "3"})
   * @returns {Object}              Flat update data for item.update()
   */
  static computeItemStatsTotals(item, pendingChanges = {}) {
    const stats = item.system.stats;
    if (!stats) return {};

    const variations = item.system.variations ?? [];
    const modifications = item.system.modifications ?? [];
    const updates = {};

    // Regex for strictly numeric values (integers and decimals, optionally negative).
    // parseFloat("3d6") returns 3, so we must NOT rely on it for detection.
    const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v).trim());

    for (const key of Object.keys(stats)) {
      // Use pending form value if available, otherwise current value
      const pendingKey = `system.stats.${key}.value`;
      const baseVal = pendingChanges[pendingKey] ?? stats[key]?.value;

      // Non-numeric fields (outfittype, weapontype, mount, hitdice "3d6") pass through unchanged
      if (!isNumeric(baseVal)) {
        updates[`system.statstotal.${key}.value`] = baseVal ?? "";
        continue;
      }

      let total = Number(baseVal);

      // Add variation stats (max 1 variation, but iterate safely)
      for (const variation of variations) {
        const varVal = variation?.system?.stats?.[key]?.value;
        if (isNumeric(varVal)) total += Number(varVal);
      }

      // Add modification stats
      for (const mod of modifications) {
        const modVal = mod?.system?.stats?.[key]?.value;
        if (isNumeric(modVal)) total += Number(modVal);
      }

      updates[`system.statstotal.${key}.value`] = String(total);
    }

    return updates;
  }

  /* -------------------------------------------- */
  static async confirmDelete(actor, itemId) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("FE2.Dialog.ConfirmRemoveTitle") },
      content: "<p>" + game.i18n.localize("FE2.Dialog.ConfirmRemoveContent") + "</p>",
      yes: {
        label: game.i18n.localize("FE2.Dialog.ConfirmRemoveYes"),
        icon: "fas fa-check"
      },
      no: {
        label: game.i18n.localize("FE2.Dialog.Cancel"),
        icon: "fas fa-times"
      }
    });
    if (confirmed) {
      actor.deleteEmbeddedDocuments("Item", [itemId]);
    }
  }

}