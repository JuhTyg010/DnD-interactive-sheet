import { Utils } from './utils.js';

export class CharacterState {
    constructor(api, onUpdateCallback) {
        this.api = api;
        this.data = {};
        this.onUpdate = onUpdateCallback; // Function to call when data changes (usually render)
    }

    async load() {
        this.data = await this.api.loadCharacter();
        this.onUpdate();
    }

    async save() {
        await this.api.saveCharacter(this.data);
        this.data = await this.api.loadCharacter();
        this.onUpdate();
    }

    // --- Direct Value Updates ---
    updateVal(key, val) { 
        this.data[key] = parseInt(val); 
        this.save(); 
    }

    updateText(key, val) { 
        this.data[key] = val; 
        this.save(); 
    }

    updateStat(stat, val) { 
        this.data.stats[stat] = parseInt(val); 
        this.save(); 
    }

    updateSkill(skill, val) { 
        this.data.skills[skill] = parseInt(val);
        this.save(); 
    }

    updateCoin(type, value) {
        if (!this.data.coins) this.data.coins = { cp:0, sp:0, ep:0, gp:0, pp:0 };
        this.data.coins[type] = parseInt(value) || 0;
        this.save();
    }

    updateAttunement(index, value) {
        if (!this.data.attunement) this.data.attunement = ["", "", ""];
        this.data.attunement[index] = value;
        this.save();
    }

    updateDeathSave(successes, failures) {
        if (!this.data.death_saves) this.data.death_saves = {};
        this.data.death_saves.success = successes;
        this.data.death_saves.failure = failures;
        this.save();
    }

    updateSpellSlots(newSlotsConfig) {        
        if (!this.data.spell_info) this.data.spell_info = {};
        const currentSlots = this.data.spell_info.slots || {};
        const resultSlots = {};

        for (const [lvl, total] of Object.entries(newSlotsConfig)) {
            const oldData = currentSlots[lvl] || { used: 0 };
            // Ensure used doesn't exceed new total
            const safeUsed = Math.min(oldData.used, total);
            
            resultSlots[lvl] = {
                total: parseInt(total),
                used: safeUsed
            };
        }

        this.data.spell_info.slots = resultSlots;
        this.save();
    }

    updateIdentity(name, charClass, subclass, species) {
        this.data.name = name;
        this.data.class = charClass;
        this.data.subclass = subclass;
        this.data.species = species;
        this.save();
    }

    toggleSpellSlot(level, index) {
        if (!this.data.spell_info?.slots) return;
        const slotData = this.data.spell_info.slots[level];
        slotData.used = (index + 1 === slotData.used) ? index : index + 1;
        this.save();
    }

    // --- Array Management (Inventory/Spells) ---
    addItem(name) {
        if(!this.data.inventory) this.data.inventory = [];
        this.data.inventory.push({ id: Utils.generateId(), name: name, type: 'item' });
        this.save();
    }

    addLanguage(name) {
        if(!this.data.languages) this.data.languages = [];
        this.data.languages.push(name);
        this.save();
    }

    deleteItem(index, category) {
        // Categories: 'item' (inventory), 'weapon', 'spell', 'feat', 'invocation'
        let list = null;
        if (category === 'item') list = this.data.inventory;
        else if (category === 'weapon') list = this.data.weapons;
        else if (category === 'spell') list = this.data.spells;
        else if (category === 'feat') list = this.data.feats;
        else if (category === 'invocation') list = this.data.invocations;
        else if (category === 'language') list = this.data.languages;

        if (list) {
            list.splice(index, 1);
            this.save();
        }
    }

    addOrUpdateEntry(listName, entryData, index = null) {
        if (!this.data[listName]) this.data[listName] = [];
        
        if (index !== null && index >= 0) {
            this.data[listName][index] = entryData;
        } else {
            this.data[listName].push(entryData);
        }
        this.save();
    }
}