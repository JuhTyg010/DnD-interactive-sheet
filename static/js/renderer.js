import { Utils } from './utils.js';

export class SheetRenderer {
    constructor(stateManager, api) {
        this.state = stateManager;
        this.api = api;
        this.STAT_LABELS = { 'str': 'STRENGTH', 'dex': 'DEXTERITY', 'con': 'CONSTITUTION', 'int': 'INTELLIGENCE', 'wis': 'WISDOM', 'cha': 'CHARISMA' };
    }

    renderAll() {
        const data = this.state.data;
        if (!data || Object.keys(data).length === 0) return;

        this.renderIdentity(data);
        this.renderHUD(data);
        this.renderStats(data);
        this.renderSpellDashboard(data);
        this.renderCoins(data);
        this.renderLists(data);
        this.renderLanguages(data);
        this.renderInvocations(data);
        this.renderAttunement(data);
    }

    renderIdentity(data) {
        document.getElementById('charName').innerText = data.name;
        document.getElementById('charClass').innerText = data.class;
        document.getElementById('charSubclass').innerText = data.subclass || "";
        document.getElementById('charSpecies').innerText = data.species || "";
        document.getElementById('lvlInput').value = data.level;
        document.getElementById('pbDisplay').innerText = `+${data.derived_pb}`;
        document.getElementById('magicBonusInput').value = data.magic_bonus || 0;
        document.getElementById('equipmentInput').value = data.equipment || "";
    }

    renderHUD(data) {
        document.getElementById('acInput').value = data.armor_class;
        document.getElementById('initInput').value = data.initiative;
        document.getElementById('speedInput').value = data.speed;
        document.getElementById('sizeInput').value = data.size || "Med";
        
        document.getElementById('hpCurr').value = data.hp_current;
        document.getElementById('hpMax').value = data.hp_max;
        document.getElementById('hpCurr').style.color = (data.hp_current <= data.hp_max / 2) ? '#e17055' : '#00b894';
        document.getElementById('hitDiceDisplay').innerText = data.hit_dice || `${data.level}${data.hit_dice_type}`;

        const ds = data.death_saves || { success: 0, failure: 0 };
        [1, 2, 3].forEach(i => {
            document.getElementById(`ds-succ-${i}`).checked = ds.success >= i;
            document.getElementById(`ds-fail-${i}`).checked = ds.failure >= i;
        });
    }

    renderStats(data) {
        const container = document.getElementById('statsGrid');
        container.innerHTML = '';
        
        for (const [stat, score] of Object.entries(data.stats)) {
            const mod = data.derived_modifiers[stat];
            const tmpl = Utils.getClone('stat-card-template');

            tmpl.querySelector('.stat-name').textContent = this.STAT_LABELS[stat];
            tmpl.querySelector('.stat-mod').textContent = `${(mod>=0?'+':'')+mod}`;
            
            const input = tmpl.querySelector('.stat-input');
            input.value = score;
            // Note: We use global app handler or bind event here. 
            // For now, binding direct logic:
            input.onchange = (e) => this.state.updateStat(stat, e.target.value);

            const saveBtn = tmpl.querySelector('.save-btn');
            saveBtn.textContent = `${(mod>=0?'+':'')+mod}`;
            saveBtn.onclick = () => window.app.roll(mod, `${stat.toUpperCase()} Save`);

            const skillsWrapper = tmpl.querySelector('.skills-wrapper');
            for (const [k, s] of Object.entries(data.calculated_skills)) {
                if (s.stat === stat) {
                    const sTmpl = Utils.getClone('skill-row-template');
                    sTmpl.querySelector('.skill-name').textContent = s.pretty_name;
                    const sel = sTmpl.querySelector('.skill-select');
                    sel.value = s.prof_level;
                    sel.classList.add("dark-input");
                    sel.onchange = (e) => this.state.updateSkill(k, e.target.value);
                    
                    const btn = sTmpl.querySelector('.skill-bonus');
                    btn.textContent = `${(s.bonus >= 0 ? '+' : '')}${s.bonus}`;
                    btn.onclick = () => window.app.roll(s.bonus, s.pretty_name);
                    skillsWrapper.appendChild(sTmpl);
                }
            }
            container.appendChild(tmpl);
        }
    }

    renderSpellDashboard(data) {
        var spellAbility = (data.spell_info?.ability) || 'cha';
        spellAbility = data.spellcasting_attribute || spellAbility;
        const abilityMod = data.derived_modifiers[spellAbility] || 0;
        const magicBonus = data.magic_bonus || 0;
        const globalDc = 8 + data.derived_pb + abilityMod + magicBonus;
        const globalAtk = data.derived_pb + abilityMod + magicBonus;

        

        document.getElementById('spellAbility').innerText = `${spellAbility.toUpperCase()} (${(abilityMod>=0?'+':'')+abilityMod})`;
        document.getElementById('globalDc').innerText = globalDc;
        document.getElementById('globalAtk').innerText = `${(globalAtk>=0?'+':'')+globalAtk}`;

        const slotsContainer = document.getElementById('spellSlotsContainer');
        slotsContainer.innerHTML = '';
        if (data.spell_info?.slots) {
            for (const [level, info] of Object.entries(data.spell_info.slots)) {
                if (info.total > 0) {
                    const row = document.createElement('div');
                    row.className = 'slot-row';
                    const bubblesDiv = document.createElement('div');
                    for (let i = 0; i < info.total; i++) {
                        const bubble = document.createElement('div');
                        bubble.className = `slot-bubble ${i < info.used ? 'used' : ''}`;
                        bubble.onclick = () => this.state.toggleSpellSlot(level, i);
                        bubblesDiv.appendChild(bubble);
                    }
                    row.innerHTML = `<div class="text-small text-gray">Level ${level}</div>`;
                    row.appendChild(bubblesDiv);
                    slotsContainer.appendChild(row);
                }
            }
        }
    }

    renderCoins(data) {
        const container = document.getElementById('coinContainer');
        container.innerHTML = '';
        const coins = data.coins || { cp:0, sp:0, ep:0, gp:0, pp:0 };
        ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(type => {
            const tmpl = Utils.getClone('coin-box-template');
            tmpl.querySelector('.coin-box').classList.add(type);
            tmpl.querySelector('.coin-label').textContent = type;
            const input = tmpl.querySelector('.coin-input');
            input.value = coins[type];
            input.onchange = (e) => this.state.updateCoin(type, e.target.value);
            container.appendChild(tmpl);
        });
    }

    renderLists(data) {
        const spellsCont = document.getElementById('spellsList');
        const itemsCont = document.getElementById('itemsList');
        const featsCont = document.getElementById('featsList');
        spellsCont.innerHTML = ''; itemsCont.innerHTML = ''; featsCont.innerHTML = '';

        // Inventory
        if (data.inventory) {
            data.inventory.forEach((item, index) => {
                itemsCont.appendChild(this.createCardNew(item, "item", index));
            });
        }
        // Weapons
        if (data.weapons) {
            data.weapons.forEach((item, index) => {
                itemsCont.appendChild(this.createCardNew(item, "weapon", index));
            });
        }
        // Feats
        if (data.feats) {
            data.feats.forEach((item, index) => {
                featsCont.appendChild(this.createCardNew(item, "feat", index));
            });
        }
        // Spells (with Filter logic)
        if (data.spells) {
             // ... [Logic for sorting/filtering spells same as original] ...
            const searchVal = document.getElementById('spellSearch')?.value.toLowerCase() || "";
            const filterVal = document.getElementById('spellFilter')?.value || "all";
            const sortVal = document.getElementById('spellSort')?.value || "level_asc";

            let processedSpells = data.spells.map((spell, index) => ({ spell, index }));

            processedSpells = processedSpells.filter(item => {
                const s = item.spell;
                if (searchVal && !s.name.toLowerCase().includes(searchVal)) return false;
                if (filterVal === "cantrip" && s.level !== "0") return false;
                if (filterVal === "leveled" && s.level === "0") return false;
                return true;
            });

            processedSpells.sort((a, b) => {
                const sA = a.spell;
                const sB = b.spell;
                if (sortVal === 'name') return sA.name.localeCompare(sB.name);
                const lvlA = parseInt(sA.level) || 0;
                const lvlB = parseInt(sB.level) || 0;
                if (lvlA !== lvlB) return (sortVal === 'level_desc') ? (lvlB - lvlA) : (lvlA - lvlB);
                return sA.name.localeCompare(sB.name);
            });

            processedSpells.forEach(item => {
                spellsCont.appendChild(this.createCardNew(item.spell, 'spell', item.index));
            });
        }
    }

    renderLanguages(data) {
        const cont = document.getElementById('languagesList');
        cont.innerHTML = '';
        if (!data.languages) return;

        data.languages.forEach((lang, index) => {
            const tag = document.createElement('div');
            tag.className = 'lang-tag';
            tag.innerHTML = `
                <span>${lang}</span>
                <span class="lang-delete" onclick="window.app.deleteEntry(${index}, 'language')">&times;</span>
            `;
            cont.appendChild(tag);
        });
    }

    createCardNew(data, category, index) {
        const tmpl = Utils.getClone("row-template");
        const card = tmpl.querySelector(".list-card");
        const notesEl = tmpl.querySelector(".item-notes");

        // Logic to find parent source
        let parentName = null;
        if(data.source && this.state.data.inventory) {
            const parent = this.state.data.inventory.find(i => i.name === data.source);
            if(parent) parentName = parent.name;
            else card.classList.add('missing-source');
        }

        if(parentName) {
            const metaEl = tmpl.querySelector(".item-meta");
            const metaSpan = document.createElement("span");
            metaSpan.className = "text-gold";
            metaSpan.innerText = `Via ${parentName}`;
            metaEl.appendChild(metaSpan);
            metaEl.classList.remove("hidden");
        }

        notesEl.textContent = data.notes;
        
        // Buttons
        tmpl.querySelector('.delete-btn').onclick = () => window.app.deleteEntry(index, category);
        tmpl.querySelector('.edit-btn').onclick = () => window.app.modals.openEdit(index, category);

        // Specific Card Type Styling
        switch(category){
            case "spell":
                this._decorateSpellCard(data, card, tmpl);
                break;
            case "weapon": 
                card.classList.add("weapon");
                this._decorateWeaponCard(data, card, tmpl);
                break;
            case "item": 
                card.classList.add("item");
                tmpl.querySelector('.item-name').textContent = data.name;
                break;
            case "feat": 
                card.classList.add("feat");
                this._decorateLinkCard(data, tmpl);
                break;
        }
        return tmpl;
    }

    _decorateSpellCard(data, card, tmpl) {
        this._decorateLinkCard(data, tmpl);
        
        const badge = tmpl.querySelector('.badge');
        badge.classList.remove('hidden');
        badge.classList.add("lvl-badge");
        if (data.level === '0') { badge.textContent = "C"; badge.classList.add('lvl-0'); }
        else if (data.level) { badge.textContent = `LVL ${data.level}`; badge.classList.add('lvl-n'); }

        const metaEl = tmpl.querySelector(".item-meta");
        metaEl.classList.remove("hidden");
        const sm = Utils.getClone("spell-meta");
        sm.querySelector('.s-duration').textContent = data.duration || 'Inst.';
        sm.querySelector('.s-range').textContent = data.range || '60ft';
        sm.querySelector('.s-type').textContent = data.action || 'Action';
        metaEl.appendChild(sm);

        tmpl.querySelector(".dmg-text").textContent = data.damage;
        tmpl.querySelector(".dmg-text").classList.remove("hidden");

        if(data.type == "spell_attack") {
            card.classList.add('combat');
            this._setupHitBtn(tmpl, data, true);
        } else if(data.type == "spell_save") {
            card.classList.add('save');
            this._setupSaveBadge(tmpl, data);
        } else if (data.type === 'utility') {
            card.classList.add('utility');
        }
    }

    _decorateWeaponCard(data, card, tmpl) {
        tmpl.querySelector('.item-name').textContent = data.name;
        const metaEl = tmpl.querySelector(".item-meta");
        metaEl.classList.remove("hidden");
        const wm = Utils.getClone("weapon-atk-meta");
        wm.querySelector('.wa-range').textContent = data.range || 'Melee';
        wm.querySelector('.wa-type').textContent = data.action || 'Action';
        metaEl.appendChild(wm);

        tmpl.querySelector(".dmg-text").textContent = data.damage;
        tmpl.querySelector(".dmg-text").classList.remove("hidden");

        this._setupHitBtn(tmpl, data, false);
    }

    _decorateLinkCard(data, tmpl) {
        const linkEl = tmpl.querySelector('.item-name');
        linkEl.textContent = data.name;
        const url = `http://dnd2024.wikidot.com/${data.level ? 'spell' : 'feat'}:${Utils.slugName(data.name)}`;
        
        this.api.checkWikidot(url).then(exists => {
            if(exists) {
                linkEl.href = url;
                linkEl.classList.add("link-styled");
            }
        });
    }

    _setupHitBtn(tmpl, data, isSpell) {
        const mod = this.state.data.derived_modifiers[data.stat] || 0;
        let hit = mod + (isSpell ? (this.state.data.magic_bonus || 0) : 0);
        if (data.proficient !== false) hit += this.state.data.derived_pb;
        
        const btn = tmpl.querySelector('.atk-btn');
        btn.classList.remove('hidden');
        tmpl.querySelector('.atk-bonus').textContent = `${(hit>=0?'+':'')+hit}`;
        btn.onclick = () => window.app.roll(hit, `${data.name} Attack`);
    }

    _setupSaveBadge(tmpl, data) {
        const mod = this.state.data.derived_modifiers[data.stat || 'cha'];
        const magicBonus = this.state.data.magic_bonus || 0;
        const dc = 8 + this.state.data.derived_pb + mod + magicBonus;
        
        const badgeDiv = tmpl.querySelector('.save-badge');
        badgeDiv.classList.remove('hidden');
        tmpl.querySelector('.save-dc').textContent = dc;
        tmpl.querySelector('.save-stat').textContent = data.save_stat;
    }

    renderInvocations(data) {
        const cont = document.getElementById('invocList');
        cont.innerHTML = '';
        if (!data.invocations) return;
        data.invocations.forEach((invoc, index) => {
            const tag = document.createElement('div');
            tag.className = 'invoc-tag';
            tag.innerHTML = `<span class="invoc-name">${invoc.name}</span><span class="invoc-desc">${invoc.desc}</span>`;
            const x = document.createElement('span');
            x.style = "margin-left:5px; cursor:pointer; color:#ccc;";
            x.innerHTML = "&times;";
            x.onclick = () => window.app.deleteEntry(index, 'invocation');
            tag.appendChild(x);
            cont.appendChild(tag);
        });
    }

    renderAttunement(data) {
        const cont = document.getElementById('attunementList');
        cont.innerHTML = '';
        const attunement = data.attunement || ["", "", ""];
        let used = 0;
        attunement.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = `attunement-row ${item.trim() ? 'active' : ''}`;
            row.innerHTML = `<div class="attunement-icon">⚷</div><input type="text" class="dark-input" style="border:none; background:transparent; padding:0;" placeholder="Empty Slot..." value="${item}">`;
            row.querySelector('input').onchange = (e) => this.state.updateAttunement(index, e.target.value);
            if (item.trim()) used++;
            cont.appendChild(row);
        });
        const countEl = document.getElementById('attunementCount');
        countEl.innerText = `${used} / 3`;
        countEl.style.color = (used === 3) ? "#e17055" : "#888";
    }
    
    addLogEntry(r) {
        const div = document.createElement('div');
        div.className = `log-entry ${r.crit ? 'crit' : ''} ${r.fail ? 'fail' : ''}`;
        div.innerHTML = `<div style="font-size:0.75em; opacity:0.8;">${r.label}</div><div style="font-size:1.4em; font-weight:bold;">${r.total} <span style="font-size:0.5em; font-weight:normal; opacity:0.6;">(d20:${r.d20}+${r.total - r.d20})</span></div>`;
        document.getElementById('log').prepend(div);
    }
}