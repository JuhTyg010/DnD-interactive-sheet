import { Utils } from './utils.js';

export class ModalHandler {
    constructor(stateManager) {
        this.state = stateManager;
        this.editingIndex = null;
        this.editingType = null;
    }

    // --- GENERIC DIALOG ---
    openAdd(mode) {
        this.editingIndex = null;
        this.editingType = mode;
        this._setupDialog(mode, false);
        document.getElementById('actionDialog').showModal();
    }

    openEdit(index, category) {
        this.editingIndex = index;

        if (category === 'feat') {
            this.editingType = 'feat';
            this._openEditFeat(index);
            return;
        }
        this.editingType = (category === 'inventory') ? 'item' : category;
        
        this._setupDialog(this.editingType, true);

        // Get data to fill
        let list;
        if (this.editingType === 'item') list = this.state.data.inventory;
        else if (this.editingType === 'weapon') list = this.state.data.weapons;
        else list = this.state.data.spells;
        
        const data = list[index];
        this._fillForm(data);
        document.getElementById('actionDialog').showModal();
    }

    commit() {
        const name = document.getElementById('actName').value;
        if (!name) return alert("Name is required!");

        const obj = this._buildObjectFromForm(name);
        
        // Determine target list name in State
        let targetList = 'spells';
        if (this.editingType === 'item') targetList = 'inventory';
        else if (this.editingType === 'weapon') targetList = 'weapons';

        this.state.addOrUpdateEntry(targetList, obj, this.editingIndex);
        document.getElementById('actionDialog').close();
    }

    // --- FEAT DIALOG ---
    openAddFeat() {
        this.editingIndex = null;
        this.editingType = 'feat';
        
        document.getElementById('newFeatName').value = '';
        document.getElementById('newFeatNotes').value = '';
        this._populateSourceSelect('newFeatSource');
        
        // Update Title/Button for "Add" mode
        const title = document.querySelector('#addFeatDialog h3');
        if(title) title.innerText = "Add New Feat";
        const btn = document.getElementById('featSubmitBtn');
        if(btn) btn.innerText = "Add";

        document.getElementById('addFeatDialog').showModal();
    }

    _openEditFeat(index) {
        const feat = this.state.data.feats[index];
        
        document.getElementById('newFeatName').value = feat.name;
        document.getElementById('newFeatNotes').value = feat.notes || '';
        
        this._populateSourceSelect('newFeatSource');
        document.getElementById('newFeatSource').value = feat.source || '';

        // Update Title/Button for "Edit" mode
        const title = document.querySelector('#addFeatDialog h3');
        if(title) title.innerText = "Edit Feat";
        const btn = document.getElementById('featSubmitBtn');
        if(btn) btn.innerText = "Save Changes";

        document.getElementById('addFeatDialog').showModal();
    }

    commitFeat() {
        const name = document.getElementById('newFeatName').value;
        if (!name) return alert("Name is required!");
        const obj = {
            name: name,
            source: document.getElementById('newFeatSource').value || null,
            notes: document.getElementById('newFeatNotes').value || ""
        };
        this.state.addOrUpdateEntry('feats', obj, this.editingIndex);
        document.getElementById('addFeatDialog').close();
    }
    
    // --- INVOCATION DIALOG ---
    commitInvoc() {
        const name = document.getElementById('newInvocName').value;
        if (!name) return alert("Name is required!");
        const obj = { 
            name: name, 
            desc: document.getElementById('newInvocDesc').value || "" 
        };
        this.state.addOrUpdateEntry('invocations', obj, null);
        document.getElementById('addInvocDialog').close();
        document.getElementById('newInvocName').value = ''; 
        document.getElementById('newInvocDesc').value = '';
    }

    openSpellSlots() {
        const container = document.getElementById('slotRowsContainer');
        container.innerHTML = '';

        const slots = this.state.data.spell_info?.slots || {};
        const levels = Object.keys(slots).sort((a,b) => parseInt(a) - parseInt(b));

        if (levels.length === 0) {
            this.addSlotRow(1, 0);
        } else {
            levels.forEach(lvl => {
                this.addSlotRow(lvl, slots[lvl].total);
            });
        }

        document.getElementById('spellSlotsDialog').showModal();
    }

    addSlotRow(level = 1, count = 1) {
        const container = document.getElementById('slotRowsContainer');
        const frag = Utils.getClone('tmpl-slot-row');
        const row = frag.querySelector('.slot-edit-row');
        row.id = Utils.generateId();

        const select = row.querySelector('.slot-level-select');
        select.innerHTML = Utils.createOptions(9, (i) => {
            return { value: i, text: `Level ${i}` };
        }, level);

        const input = row.querySelector('.slot-count-input');
        input.value = count;

        row.querySelector('.btn-delete').onclick = () => row.remove();

        container.appendChild(frag);
    }

    commitSpellSlots() {
        const container = document.getElementById('slotRowsContainer');
        const rows = container.querySelectorAll('.slot-edit-row');
        const newConfig = {};

        rows.forEach(row => {
            const lvl = row.querySelector('.slot-level-select').value;
            const count = row.querySelector('.slot-count-input').value;
            
            if (parseInt(count) > 0) {
                newConfig[lvl] = parseInt(count);
            }
        });

        this.state.updateSpellSlots(newConfig);
        document.getElementById('spellSlotsDialog').close();
    }

    openIdentity() {
        const d = this.state.data;
        document.getElementById('idName').value = d.name || "";
        document.getElementById('idClass').value = d.class || "";
        document.getElementById('idSubclass').value = d.subclass || "";
        document.getElementById('idSpecies').value = d.species || "";
        
        document.getElementById('identityDialog').showModal();
    }

    commitIdentity() {
        const name = document.getElementById('idName').value;
        const charClass = document.getElementById('idClass').value;
        const subclass = document.getElementById('idSubclass').value;
        const species = document.getElementById('idSpecies').value;
        const hitDieType = document.getElementById('idHitDieType').value;
        const spellcastingAttr = document.getElementById('idSpellcastingAttr').value;

        if (!name) return alert("Name is required!");

        this.state.updateIdentity(name, charClass, subclass, species);
        this.state.updateText('hit_dice_type',hitDieType);
        this.state.updateText('spellcasting_attribute', spellcastingAttr);
        document.getElementById('identityDialog').close();
    }

    openAddLanguage() {
        document.getElementById('newLangName').value = '';
        document.getElementById('addLanguageDialog').showModal();
    }

    commitLanguage() {
        const name = document.getElementById('newLangName').value;
        if (!name) return alert("Language name is required!");
        
        this.state.addLanguage(name);
        document.getElementById('addLanguageDialog').close();
    }

    // --- INTERNAL HELPERS ---
    _setupDialog(mode, isEditing) {
        document.getElementById('actModalTitle').innerText = isEditing ? `Edit ${mode}` : `Add ${mode}`;
        document.getElementById('actSubmitBtn').innerText = isEditing ? "Save" : "Add";
        
        document.getElementById('actName').value = '';
        document.getElementById('actNotes').value = '';

        this._fillSlot('slotType', mode === 'item' ? 'tmpl-item-type' : (mode === 'weapon' ? 'tmpl-weapon-type' : 'tmpl-spell-type'));
        this._fillSlot('slotLevel', mode === 'spell' ? 'tmpl-spell-level' : null);
        this._fillSlot('slotStats', mode === 'item' ? 'tmpl-item-stats' : (mode === 'weapon' ? 'tmpl-weapon-stats' : 'tmpl-spell-stats'));
        
        this._populateSourceSelect('actSource');
    }

    _fillSlot(slotId, tmplId) {
        const slot = document.getElementById(slotId);
        slot.innerHTML = ''; 
        if(tmplId) slot.appendChild(Utils.getClone(tmplId));
    }

    _populateSourceSelect(elementId) {
        const sel = document.getElementById(elementId);
        if(!sel) return;
        sel.innerHTML = '<option value="">- Innate / No Source -</option>';
        if (this.state.data.inventory) {
            this.state.data.inventory.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = item.name;
                sel.appendChild(opt);
            });
        }
    }

    _fillForm(data) {
        document.getElementById('actName').value = data.name;
        document.getElementById('actNotes').value = data.notes || '';
        document.getElementById('actSource').value = data.source || '';
        
        // Helper to safely set value
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        
        setVal('actType', data.type);
        setVal('actLevel', data.level || '0');
        setVal('actStat', data.stat || 'str');
        setVal('actRange', data.range || '');
        setVal('actDuration', data.duration || '');
        setVal('actDmg', data.damage || '');
        setVal('actActionType', data.action || '');
        
        const profEl = document.getElementById('actProf');
        if (profEl) profEl.checked = (data.proficient !== false);
        
        setVal('actSaveTarget', data.save_stat || '');
    }

    _buildObjectFromForm(name) {
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : undefined;
        
        const obj = {
            name: name,
            source: getVal('actSource') || null,
            notes: getVal('actNotes') || '',
            type: getVal('actType') || 'item',
            level: getVal('actLevel'),
            stat: getVal('actStat'),
            range: getVal('actRange'),
            duration: getVal('actDuration'),
            damage: getVal('actDmg'),
            action: getVal('actActionType')
        };

        const profEl = document.getElementById('actProf');
        if (profEl) obj.proficient = profEl.checked;
        
        const saveStat = getVal('actSaveTarget');
        if (saveStat) {
            obj.save_stat = saveStat;
            if (obj.type === 'spell_attack') obj.type = 'spell_save';
        }
        
        if (this.editingType === 'item' && !this.editingIndex && this.editingIndex !== 0) {
            obj.id = Utils.generateId();
        }

        return obj;
    }
}