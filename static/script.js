let charData = {};
const STAT_LABELS = { 'str': 'STRENGTH', 'dex': 'DEXTERITY', 'con': 'CONSTITUTION', 'int': 'INTELLIGENCE', 'wis': 'WISDOM', 'cha': 'CHARISMA' };

document.addEventListener('mouseover', (e) => {
    // 1. Look up the tree to find the parent tag
    // This works even if you hover <span class="invoc-name">
    const tag = e.target.closest('.invoc-tag');

    // 2. Safety Checks
    if (!tag) return; // Not hovering a tag
    
    // STOP JITTER: If we are hovering the tooltip itself, do nothing.
    // We only want to calculate position when hovering the "trigger" (the name/tag),
    // not when the user is trying to read/scroll the popup.
    if (e.target.closest('.invoc-desc')) return;

    const tooltip = tag.querySelector('.invoc-desc');
    if (!tooltip) return;

    // 3. Reset styles to default (Centered)
    tooltip.style.left = '50%';
    tooltip.style.right = 'auto';
    tooltip.style.transform = 'translateX(-50%) translateY(-15px)';
    tooltip.style.bottom = '100%';
    tooltip.style.top = 'auto';

    // 4. Measure
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // --- LEFT EDGE COLLISION ---
    if (rect.left < 10) { 
        tooltip.style.left = '0';
        tooltip.style.transform = 'translateY(-15px)'; 
    } 
    // --- RIGHT EDGE COLLISION ---
    else if (rect.right > viewportWidth - 10) {
        tooltip.style.left = 'auto';
        tooltip.style.right = '0';
        tooltip.style.transform = 'translateY(-15px)'; 
    }

    // --- TOP EDGE COLLISION ---
    if (rect.top < 0) {
        tooltip.style.bottom = 'auto';
        tooltip.style.top = '100%';
        // Flip the Y offset to push it DOWN instead of UP
        tooltip.style.transform = tooltip.style.transform.replace('translateY(-15px)', 'translateY(10px)');
    }
});


// Global State for Editing
let editingIndex = null;
let editingType = null; // 'weapon' or 'spell'

// --- API INTERACTIONS ---
async function load() {
    const res = await fetch('/api/character');
    charData = await res.json();
    render();
}

async function save() {
    await fetch('/api/character', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(charData)
    });
    load();
}

async function roll(bonus, label) {
    const res = await fetch('/api/roll', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ bonus: bonus, label: label })
    });
    const r = await res.json();
    addLogEntry(r);
}

// --- STATE UPDATES ---
function updateVal(key, val) { charData[key] = parseInt(val); save(); }
function updateText(key, val) { charData[key] = val; save(); }
function updateStat(stat, val) { charData.stats[stat] = parseInt(val); save(); }
function updateSkill(skill, val) { charData.skills[skill] = parseInt(val); save(); }

// --- COIN LOGIC ---
function updateCoin(type, value) {
    if (!charData.coins) charData.coins = { cp:0, sp:0, ep:0, gp:0, pp:0 };
    charData.coins[type] = parseInt(value) || 0;
    save();
}

function modifyCoin(type, amount) {
    if (!charData.coins) charData.coins = { cp:0, sp:0, ep:0, gp:0, pp:0 };
    let current = charData.coins[type] || 0;
    current += amount;
    if (current < 0) current = 0;
    charData.coins[type] = current;
    save();
}

// --- INVENTORY HELPERS ---
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

function commitInventoryItem(name) {
    if(!charData.inventory) charData.inventory = [];
    charData.inventory.push({ id: generateId(), name: name, type: 'item' });
    save();
}

function deleteInventoryItem(id) {
    if(!confirm("Delete Item? Linked attacks will break!")) return;
    charData.inventory = charData.inventory.filter(i => i.id !== id);
    save();
}

// --- MODAL & FORM LOGIC ---
function toggleSaveInput() {
    const type = document.getElementById('newAtkType').value;
    const saveInput = document.getElementById('newAtkTargetSave');
    if (type === 'spell_save') {
        saveInput.classList.remove('hidden'); // Shows it
    } else {
        saveInput.classList.add('hidden');    // Hides it
        saveInput.value = ""; // Optional: Reset value when hidden
    }
}

function updateModalView() {
    const type = document.getElementById('newAtkType').value;
    const lvlInput = document.getElementById('newAtkLevel');
    
    // Hide level if it starts with 'weapon' or is 'item'
    if (type.startsWith('weapon') || type === 'item') {
        lvlInput.style.visibility = 'hidden'; // Keep spacing in grid, just hide it
    } else {
        lvlInput.style.visibility = 'visible';
    }
}

async function checkSite(targetUrl) {
    try {
        // We send the URL to OUR server, not the browser
        const res = await fetch('/api/check-wikidot', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url: targetUrl })
        });

        const data = await res.json();
        return data.exists; // Returns true or false cleanly

    } catch (error) {
        console.error("Internal API Error:", error);
        return false;
    }
}

function fillSlot(slotId, templateId) {
    const slot = document.getElementById(slotId);
    slot.innerHTML = ''; // Clear previous
    const tmpl = document.getElementById(templateId);
    if (tmpl) {
        slot.appendChild(tmpl.content.cloneNode(true));
    }
}

// 1. OPEN NEW (REPLACES openAddAttack)
function openAddAttack(mode = 'spell', isEditing = false) {
    // FIX: Only reset the index if we are creating a NEW entry.
    if (!isEditing) {
        editingIndex = null;
    }
    editingType = mode; // 'spell', 'weapon', or 'item'

    const dialog = document.getElementById('actionDialog');
    document.getElementById('actModalTitle').innerText = mode === 'item' ? "Add Item" : "Add " + mode;
    document.getElementById('actSubmitBtn').innerText = "Add";

    // 1. Reset Common Inputs
    document.getElementById('actName').value = '';
    document.getElementById('actNotes').value = '';

    // 2. Load Templates based on Mode
    if (mode === 'spell') {
        fillSlot('slotType', 'tmpl-spell-type');
        fillSlot('slotLevel', 'tmpl-spell-level');
        fillSlot('slotStats', 'tmpl-spell-stats');
    } 
    else if (mode === 'weapon') {
        fillSlot('slotType', 'tmpl-weapon-type');
        fillSlot('slotLevel', null); // Clear level slot
        fillSlot('slotStats', 'tmpl-weapon-stats');
    } 
    else if (mode === 'item') {
        fillSlot('slotType', 'tmpl-item-type');
        fillSlot('slotLevel', null);
        fillSlot('slotStats', 'tmpl-item-stats');
    }

    // 3. Populate Source Dropdown (Common to all)
    const sourceSelect = document.getElementById('actSource');
    sourceSelect.innerHTML = '<option value="">- Innate / No Source -</option>';
    if (charData.inventory) {
        charData.inventory.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.textContent = item.name;
            sourceSelect.appendChild(opt);
        });
    }
    if(document.getElementById('actProf')) {
        document.getElementById('actProf').checked = true;
    }   

    dialog.showModal();
}

// 2. EDIT EXISTING (REPLACES editEntry)
function editEntry(index, category) {
    editingIndex = index;
    // Map 'inventory' category to 'item' mode for our modal logic
    editingType = (category === 'inventory') ? 'item' : category; 

    // 1. Open the modal (loads the correct templates)
    openAddAttack(editingType, true);
    document.getElementById('actModalTitle').innerText = "Edit " + editingType;
    document.getElementById('actSubmitBtn').innerText = "Save Changes";

    // 2. Get the data
    let list;
    if (editingType === 'item') list = charData.inventory;
    else if (editingType === 'weapon') list = charData.weapons;
    else list = charData.spells;
    
    const data = list[index];

    // 3. Fill Common Fields
    document.getElementById('actName').value = data.name;
    document.getElementById('actNotes').value = data.notes || '';
    document.getElementById('actSource').value = data.source || '';
    
    // 4. Fill Dynamic Fields (Safe check: if element exists)
    // We check if the element exists because 'item' mode won't have 'actDmg' etc.
    if (document.getElementById('actType')) document.getElementById('actType').value = data.type;
    if (document.getElementById('actLevel')) document.getElementById('actLevel').value = data.level || '0';
    if (document.getElementById('actStat')) document.getElementById('actStat').value = data.stat || 'str';
    if (document.getElementById('actRange')) document.getElementById('actRange').value = data.range || '';
    if (document.getElementById('actDuration')) document.getElementById('actDuration').value = data.duration || '';
    if (document.getElementById('actDmg')) document.getElementById('actDmg').value = data.damage || '';
    if (document.getElementById('actActionType')) document.getElementById('actActionType').value = data.action || '';
    

    if (document.getElementById('actProf')) {
        document.getElementById('actProf').checked = (data.proficient !== false);
    }
    if (document.getElementById('actSaveTarget')) {
        // Special logic for Spells: 
        // If it was saved as 'spell_save', the dropdown logic might need handling
        document.getElementById('actSaveTarget').value = data.save_stat || '';
    }
}

// 3. SAVE / COMMIT (REPLACES commitAttack)
function commitAction() {
    const name = document.getElementById('actName').value;
    if (!name) return alert("Name is required!");

    // Basic Object
    const obj = {
        name: name,
        source: document.getElementById('actSource').value || null,
        notes: document.getElementById('actNotes').value || '',
        type: document.getElementById('actType') ? document.getElementById('actType').value : 'item'
    };

    // Add Stats if they exist in the DOM
    if (document.getElementById('actLevel')) obj.level = document.getElementById('actLevel').value;
    if (document.getElementById('actStat')) obj.stat = document.getElementById('actStat').value;
    if (document.getElementById('actRange')) obj.range = document.getElementById('actRange').value;
    if (document.getElementById('actDuration')) obj.duration = document.getElementById('actDuration').value;
    if (document.getElementById('actDmg')) obj.damage = document.getElementById('actDmg').value;
    if (document.getElementById('actActionType')) obj.action = document.getElementById('actActionType').value;
    

    if (document.getElementById('actProf')) {
        obj.proficient = document.getElementById('actProf').checked;
    }
    if (document.getElementById('actSaveTarget')) {
        const saveStat = document.getElementById('actSaveTarget').value;
        if (saveStat) {
            obj.save_stat = saveStat;
            // Auto-correct type if user selected a save stat but left type as spell_attack
            if (obj.type === 'spell_attack') obj.type = 'spell_save';
        }
    }

    // Determine List
    let targetList;
    if (editingType === 'item') {
        if (!charData.inventory) charData.inventory = [];
        targetList = charData.inventory;
        if (!obj.id) obj.id = 'id_' + Math.random().toString(36).substr(2, 9); // ID for items
    } else if (editingType === 'weapon') {
        if (!charData.weapons) charData.weapons = [];
        targetList = charData.weapons;
    } else {
        if (!charData.spells) charData.spells = [];
        targetList = charData.spells;
    }

    // Save
    if (editingIndex !== null && editingIndex >= 0) {
        targetList[editingIndex] = obj;
    } else {
        targetList.push(obj);
    }

    save();
    document.getElementById('actionDialog').close();
}
// --- 4. DELETE ---
function deleteEntry(index, category) {
    if (confirm("Remove this item? Linked actions might break!")) {
        if (category === 'item') {
            charData.inventory.splice(index, 1);
        } else if (category === 'weapon') {
            charData.weapons.splice(index, 1);
        } else if ("spell") {
            charData.spells.splice(index, 1);
        } else if ("feat") {
            charData.feats.splice(index, 1);
        }
        save();
    }
}

// --- OTHER FEATURES ---
function commitInvoc() {
    const name = document.getElementById('newInvocName').value;
    if (!name) return alert("Invocation Name is required!");
    if (!charData.invocations) charData.invocations = [];
    charData.invocations.push({ name: name, desc: document.getElementById('newInvocDesc').value || "" });
    save();
    document.getElementById('addInvocDialog').close();
    document.getElementById('newInvocName').value = ''; document.getElementById('newInvocDesc').value = '';
}

function deleteInvoc(index) {
    if (confirm("Remove Invocation?")) { charData.invocations.splice(index, 1); save(); }
}

function updateAttunement(index, value) {
    if (!charData.attunement) charData.attunement = ["", "", ""];
    charData.attunement[index] = value;
    save();
}

// --- FEAT MODAL LOGIC ---
let editingFeatIndex = null;

function openAddFeat() {
    editingFeatIndex = null;
    document.getElementById('newFeatName').value = '';
    document.getElementById('newFeatNotes').value = '';
    
    // Populate Source Dropdown
    const sourceSelect = document.getElementById('newFeatSource');
    sourceSelect.innerHTML = '<option value="">- Innate / No Item -</option>';
    
    if (charData.inventory) {
        charData.inventory.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.textContent = item.name;
            sourceSelect.appendChild(opt);
        });
    }

    document.getElementById('featModalTitle').innerText = "Add New Feature";
    document.getElementById('featSubmitBtn').innerText = "Add";
    document.getElementById('addFeatDialog').showModal();
}

function commitFeat() {
    const name = document.getElementById('newFeatName').value;
    if (!name) return alert("Name is required!");

    const featObj = {
        name: name,
        source: document.getElementById('newFeatSource').value || null, // SAVE LINK
        notes: document.getElementById('newFeatNotes').value || ""
    };

    if (!charData.feats) charData.feats = [];

    if (editingFeatIndex !== null) {
        charData.feats[editingFeatIndex] = featObj;
    } else {
        charData.feats.push(featObj);
    }
    
    save();
    document.getElementById('addFeatDialog').close();
}

function deleteFeat(index) {
    if (confirm("Remove feat?")) { charData.feats.splice(index, 1); save(); }
}

function slugName(name) {
    return name.toLowerCase().replace(/['’]/g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function getClone(id) {
    return document.getElementById(id).content.cloneNode(true);
}

function updateDeathSave() {
    let s = 0, f = 0;
    if(document.getElementById('ds-succ-1').checked) s++;
    if(document.getElementById('ds-succ-2').checked) s++;
    if(document.getElementById('ds-succ-3').checked) s++;
    if(document.getElementById('ds-fail-1').checked) f++;
    if(document.getElementById('ds-fail-2').checked) f++;
    if(document.getElementById('ds-fail-3').checked) f++;
    
    if (!charData.death_saves) charData.death_saves = {};
    charData.death_saves.success = s; charData.death_saves.failure = f;
    save();
}

function toggleSlot(level, index) {
    if (!charData.spell_info?.slots) return;
    const slotData = charData.spell_info.slots[level];
    slotData.used = (index + 1 === slotData.used) ? index : index + 1;
    save();
}

// --- RENDER LOGIC ---
function addLogEntry(r) {
    const div = document.createElement('div');
    div.className = `log-entry ${r.crit ? 'crit' : ''} ${r.fail ? 'fail' : ''}`;
    div.innerHTML = `<div style="font-size:0.75em; opacity:0.8;">${r.label}</div><div style="font-size:1.4em; font-weight:bold;">${r.total} <span style="font-size:0.5em; font-weight:normal; opacity:0.6;">(d20:${r.d20}+${r.total - r.d20})</span></div>`;
    document.getElementById('log').prepend(div);
}

function render() {
    renderIdentity();
    renderHUD();
    renderStats();
    renderSpellDashboard();
    renderCoins();
    renderAttacksAndItems();
    renderInvocations();
    renderAttunement();
    renderFeats();
}

function renderIdentity() {
    document.getElementById('charName').innerText = charData.name;
    document.getElementById('charClass').innerText = charData.class;
    document.getElementById('charSubclass').innerText = charData.subclass || "";
    document.getElementById('charSpecies').innerText = charData.species || "";
    document.getElementById('lvlInput').value = charData.level;
    document.getElementById('pbDisplay').innerText = `+${charData.derived_pb}`;
    document.getElementById('magicBonusInput').value = charData.magic_bonus || 0;
    document.getElementById('equipmentInput').value = charData.equipment || "";
}

function renderHUD() {
    document.getElementById('acInput').value = charData.armor_class;
    document.getElementById('initInput').value = charData.initiative;
    document.getElementById('speedInput').value = charData.speed;
    document.getElementById('sizeInput').value = charData.size || "Med";
    
    document.getElementById('hpCurr').value = charData.hp_current;
    document.getElementById('hpMax').value = charData.hp_max;
    document.getElementById('hpCurr').style.color = (charData.hp_current <= charData.hp_max / 2) ? '#e17055' : '#00b894';
    document.getElementById('hitDiceDisplay').innerText = charData.hit_dice || `${charData.level}d8`;

    const ds = charData.death_saves || { success: 0, failure: 0 };
    [1, 2, 3].forEach(i => {
        document.getElementById(`ds-succ-${i}`).checked = ds.success >= i;
        document.getElementById(`ds-fail-${i}`).checked = ds.failure >= i;
    });
}

function renderStats() {
    const container = document.getElementById('statsGrid');
    container.innerHTML = '';
    
    for (const [stat, score] of Object.entries(charData.stats)) {
        const mod = charData.derived_modifiers[stat];
        const tmpl = document.getElementById('stat-card-template').content.cloneNode(true);

        tmpl.querySelector('.stat-name').textContent = STAT_LABELS[stat];
        tmpl.querySelector('.stat-mod').textContent = `${(mod>=0?'+':'')+mod}`;
        
        const input = tmpl.querySelector('.stat-input');
        input.value = score;
        input.addEventListener('change', (e) => updateStat(stat, e.target.value));

        const saveBtn = tmpl.querySelector('.save-btn');
        saveBtn.textContent = `${(mod>=0?'+':'')+mod}`;
        saveBtn.onclick = () => roll(mod, `${stat.toUpperCase()} Save`);

        const skillsWrapper = tmpl.querySelector('.skills-wrapper');
        for (const [k, s] of Object.entries(charData.calculated_skills)) {
            if (s.stat === stat) {
                const sTmpl = document.getElementById('skill-row-template').content.cloneNode(true);
                sTmpl.querySelector('.skill-name').textContent = s.pretty_name;
                const sel = sTmpl.querySelector('.skill-select');
                sel.value = s.prof_level;
                sel.onchange = (e) => updateSkill(k, e.target.value);
                const btn = sTmpl.querySelector('.skill-bonus');
                btn.textContent = `${(s.bonus >= 0 ? '+' : '')}${s.bonus}`;
                btn.onclick = () => roll(s.bonus, s.pretty_name);
                skillsWrapper.appendChild(sTmpl);
            }
        }
        container.appendChild(tmpl);
    }
}

function renderSpellDashboard() {
    const spellAbility = (charData.spell_info?.ability) || 'cha';
    const abilityMod = charData.derived_modifiers[spellAbility];
    const magicBonus = charData.magic_bonus || 0;
    const globalDc = 8 + charData.derived_pb + abilityMod + magicBonus;
    const globalAtk = charData.derived_pb + abilityMod + magicBonus;

    document.getElementById('spellAbility').innerText = `${spellAbility.toUpperCase()} (${(abilityMod>=0?'+':'')+abilityMod})`;
    document.getElementById('globalDc').innerText = globalDc;
    document.getElementById('globalAtk').innerText = `${(globalAtk>=0?'+':'')+globalAtk}`;

    const slotsContainer = document.getElementById('spellSlotsContainer');
    slotsContainer.innerHTML = '';
    if (charData.spell_info?.slots) {
        for (const [level, info] of Object.entries(charData.spell_info.slots)) {
            if (info.total > 0) {
                const row = document.createElement('div');
                row.className = 'slot-row';
                const bubblesDiv = document.createElement('div');
                for (let i = 0; i < info.total; i++) {
                    const bubble = document.createElement('div');
                    bubble.className = `slot-bubble ${i < info.used ? 'used' : ''}`;
                    bubble.onclick = () => toggleSlot(level, i);
                    bubblesDiv.appendChild(bubble);
                }
                row.innerHTML = `<div class="text-small text-gray">Level ${level}</div>`;
                row.appendChild(bubblesDiv);
                slotsContainer.appendChild(row);
            }
        }
    }
}

function renderCoins() {
    const container = document.getElementById('coinContainer');
    container.innerHTML = '';
    const coins = charData.coins || { cp:0, sp:0, ep:0, gp:0, pp:0 };
    ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(type => {
        const tmpl = document.getElementById('coin-box-template').content.cloneNode(true);
        tmpl.querySelector('.coin-box').classList.add(type);
        tmpl.querySelector('.coin-label').textContent = type;
        const input = tmpl.querySelector('.coin-input');
        input.value = coins[type];
        input.onchange = (e) => updateCoin(type, e.target.value);
        container.appendChild(tmpl);
    });
}

function renderAttacksAndItems() {
    const spellsCont = document.getElementById('spellsList');
    const itemsCont = document.getElementById('itemsList');
    spellsCont.innerHTML = ''; 
    itemsCont.innerHTML = '';

    // 1. RENDER INVENTORY (No sorting needed yet)
    if (charData.inventory) {
        charData.inventory.forEach((item, index) => {
            itemsCont.appendChild(createCardNew(item, "item", index));
        });
    }

    // 2. RENDER WEAPONS (No sorting needed yet)
    if (charData.weapons) {
        charData.weapons.forEach((data, index) => {
            itemsCont.appendChild(createCardNew(data, 'weapon', index));
        });
    }

    // 3. RENDER SPELLS (With Filter & Sort)
    if (charData.spells) {
        // A. Get Control Values (Safe check in case element doesn't exist yet)
        const searchVal = document.getElementById('spellSearch')?.value.toLowerCase() || "";
        const filterVal = document.getElementById('spellFilter')?.value || "all";
        const sortVal = document.getElementById('spellSort')?.value || "level_asc";

        // B. Create a mapped array so we keep the original Index for editing/deleting!
        // We store { spell, originalIndex }
        let processedSpells = charData.spells.map((spell, index) => ({ spell, index }));

        // C. Filter
        processedSpells = processedSpells.filter(item => {
            const s = item.spell;
            
            // Text Search
            if (searchVal && !s.name.toLowerCase().includes(searchVal)) return false;

            // Type Filter
            if (filterVal === "cantrip" && s.level !== "0") return false;
            if (filterVal === "leveled" && s.level === "0") return false;

            return true;
        });

        // D. Sort
        processedSpells.sort((a, b) => {
            const sA = a.spell;
            const sB = b.spell;

            if (sortVal === 'name') {
                return sA.name.localeCompare(sB.name);
            } else {
                // Level Sort (0 vs 1-9)
                const lvlA = parseInt(sA.level) || 0;
                const lvlB = parseInt(sB.level) || 0;
                
                if (lvlA !== lvlB) {
                    return (sortVal === 'level_desc') ? (lvlB - lvlA) : (lvlA - lvlB);
                }
                // Tie-breaker: Name
                return sA.name.localeCompare(sB.name);
            }
        });

        // E. Render
        processedSpells.forEach(item => {
            // We pass the ORIGINAL index so Edit/Delete works on the correct item
            spellsCont.appendChild(createCardNew(item.spell, 'spell', item.index));
        });
    }
}

function checkParentObject(source) {
    let parentItem = null;
    if (source) {
        parentItem = charData.inventory ? charData.inventory.find(i => i.name === source) : null;
    }
    return parentItem;
}

function createElement(type, baseClass, value = null){
    let elem = document.createElement(type);
    elem.classList.add(baseClass);
    if(value){
        elem.textContent = value;
    }
    return elem;
}

function featCard(data, tmpl, index){
    const linkEl = tmpl.querySelector('.item-name');
    const link = `http://dnd2024.wikidot.com/feat:${slugName(data.name)}`;

    linkEl.textContent = data.name;

    checkSite(link).then((exists) => {
        if(exists){
            linkEl.href = link;
            linkEl.classList.add("link-styled");
        } else {
            linkEl.classList.remove("link-styled");
        }
    });

    return tmpl;

}

function itemCard(data, tmpl, index){
    const nameEl = tmpl.querySelector('.item-name');
    nameEl.textContent = data.name;

    return tmpl;
}

function setSpellCardColor(data, card, tmpl) {
    const magicBonus = charData.magic_bonus || 0;
    if(data.type == "spell_attack") {
        card.classList.add('combat'); // Purple Border
        setupHitButton(tmpl, data, "spell");
    } else if(data.type == "spell_save") {
        card.classList.add('save'); // Orange Border
        setupSaveBadge(data, tmpl, magicBonus);
    } else if (data.type === 'utility') {
        card.classList.add('utility'); // Cyan Border
    }
}

function spellCard(data, tmpl, index) {

    const linkEl = tmpl.querySelector('.item-name');
    const badge = tmpl.querySelector('.badge');
    const link = `http://dnd2024.wikidot.com/spell:${slugName(data.name)}`;
    const metaEl = tmpl.querySelector(".item-meta");
    const spellMeta = getClone("spell-meta");
    const dmgEl = tmpl.querySelector(".dmg-text");
    //SET NAME AND ADD LINK IF POSSIBLE
    linkEl.textContent = data.name;
    checkSite(link).then((exists) => {
        if(exists){
            linkEl.href = link;
            linkEl.classList.add("link-styled");
        } else {
            linkEl.classList.remove("link-styled");
        }
    });

    //SHOW LVL BADGE
    badge.classList.remove('hidden');
    badge.classList.add("lvl-badge");
    if (data.level === '0') { badge.textContent = "C"; badge.classList.add('lvl-0'); }
    else if (data.level) { badge.textContent = `LVL ${data.level}`; badge.classList.add('lvl-n'); }
    else badge.classList.add('hidden');

    //SPELL META SETTING
    spellMeta.querySelector('.s-duration').textContent = data.duration || 'Inst.';
    spellMeta.querySelector('.s-range').textContent = data.range || '60ft';
    spellMeta.querySelector('.s-type').textContent = data.action || 'Action';

    metaEl.appendChild(spellMeta);
    metaEl.classList.remove("hidden");

    dmgEl.textContent = data.damage;
    dmgEl.classList.remove("hidden");

    return tmpl;
}

function weaponCard(data, tmpl, index) {

    const nameEl = tmpl.querySelector('.item-name');
    const metaEl = tmpl.querySelector(".item-meta");
    const weaponMeta = getClone("weapon-atk-meta");
    const dmgEl = tmpl.querySelector(".dmg-text");

    nameEl.textContent = data.name;

    weaponMeta.querySelector('.wa-range').textContent = data.range || 'Melee';
    weaponMeta.querySelector('.wa-type').textContent = data.action || 'Action';
    metaEl.appendChild(weaponMeta);
    metaEl.classList.remove("hidden");
    dmgEl.textContent = data.damage;
    dmgEl.classList.remove("hidden");

    setupHitButton(tmpl, data, "weapon");

    return tmpl;
}

function createCardNew(data, category, index) {   //categories item, spell, weapon, feat?
    const tmpl = getClone("row-template");
    const card = tmpl.querySelector(".list-card");
    const notesEl = tmpl.querySelector(".item-notes");

    const parent = checkParentObject(data.source);
    if(data.source) {
        if(parent){
            const metaEl = tmpl.querySelector(".item-meta");
            const metaSpan = createElement("span", "text-gold", `Via ${parent.name}`);
            metaEl.appendChild(metaSpan);
        } else {
            card.classList.add('missing-source');
            //TODO: add badge
        }
    }

    notesEl.textContent = data.notes;

    tmpl.querySelector('.delete-btn').onclick = () => deleteEntry(index, category);
    tmpl.querySelector('.edit-btn').onclick = () => editEntry(index, category);

    switch(category){
        case "spell":
            setSpellCardColor(data, card, tmpl);
            return spellCard(data, tmpl, index);
        case "weapon": 
            card.classList.add("weapon");
            return weaponCard(data, tmpl, index);
        case "item": 
            card.classList.add("item");
            return itemCard(data, tmpl, index);
        case "feat": 
            card.classList.add("feat");
            return featCard(data, tmpl, index);
        default: console.error("Unknowned category" + data);
    }
}

// --- FIXED CREATE CARD FUNCTION ---
function createCard(data, category, index) {
    const tmpl = getClone('attack-row-template');
    const card = tmpl.querySelector('.list-card');
    const nameEl = tmpl.querySelector('.atk-name');
    const badge = tmpl.querySelector('.lvl-badge');

    // 1. Check for Source Object (Missing Item Check)
    if (data.source) {
        // Change: Find by name
        const parentItem = charData.inventory ? charData.inventory.find(i => i.name === data.source) : null;
        
        if (parentItem) {
            const meta = tmpl.querySelector('.atk-meta');
            meta.innerHTML = `<span style="color:var(--c-gold-light);">Via ${parentItem.name}</span> | ` + meta.innerHTML;
        } else {
            // Object exists in attack data, but not in inventory -> LOST
            card.classList.add('missing-source');
            // Adding a tooltip so you know what is missing
            nameEl.innerHTML = `<span class="missing-badge" title="Missing: ${data.source}" style="background:var(--c-red); color:white; font-size:0.7em; padding:2px 5px; border-radius:4px; font-weight:bold;">LOST</span> ` + nameEl.innerHTML;
        }
    }

    // 2. Level Badge (Hide for weapons)
    if (category === 'spell') {
        badge.classList.remove('hidden');
        if (data.level === '0') { badge.textContent = "C"; badge.classList.add('lvl-0'); }
        else if (data.level) { badge.textContent = `LVL ${data.level}`; badge.classList.add('lvl-n'); }
        else badge.classList.add('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // 3. Name & Link
    if (category === 'spell') nameEl.textContent = data.name; // Keep text if link fails
    else nameEl.textContent = data.name;

    if (category === 'weapon') {
        nameEl.style.color = '#e0e0e0'; nameEl.style.cursor = 'default';
    } else {
        const slug = slugName(data.name);
        nameEl.href = `http://dnd2024.wikidot.com/spell:${slug}`;
        nameEl.classList.add('link-styled');
    }

    // 4. Meta
    let meta = `${data.range}`;
    if (data.duration) meta += ` • ${data.duration}`;
    if (data.notes) meta += ` | ${data.notes}`;
    tmpl.querySelector('.atk-meta').innerHTML += meta; // Append to existing meta (via logic above)
    tmpl.querySelector('.atk-dmg').textContent = data.damage;

    // 5. Buttons & Colors
    const magicBonus = charData.magic_bonus || 0;
    card.classList.remove('combat', 'weapon', 'save', 'utility', 'item');

    const type = data.type; // e.g. 'weapon_melee', 'spell_save'

    if (type === 'weapon_melee' || type === 'weapon_range') {
        card.classList.add('weapon'); // Grey Border
        // Logic for Hit Button
        setupHitButton(tmpl, data, category); 
    } 
    else if (type === 'item') {
        card.classList.add('item'); // Gold Border
    }
    else if (type === 'spell_attack') {
        card.classList.add('combat'); // Purple Border
        setupHitButton(tmpl, data, category);
    }
    else if (type === 'spell_save') {
        card.classList.add('save'); // Orange Border
        // Setup DC Badge logic...
    }
    else if (type === 'utility') {
        card.classList.add('utility'); // Cyan Border
    }
    
    // Apply Class based on stored type OR category
    const typeClass = (data.type === 'spell_save') ? 'save' : (category === 'weapon' ? 'weapon' : (data.type || 'combat'));
    card.classList.add(typeClass);

    if (typeClass === 'combat' || typeClass === 'weapon') {
        const mod = charData.derived_modifiers[data.stat] || 0;
        let hit = mod + charData.derived_pb + (category === 'spell' ? magicBonus : 0);
        const btn = tmpl.querySelector('.atk-btn');
        btn.classList.remove('hidden');
        tmpl.querySelector('.atk-bonus').textContent = `${(hit>=0?'+':'')+hit}`;
        btn.onclick = () => roll(hit, `${data.name} Attack`);
    } 
    else if (typeClass === 'save') {
        const mod = charData.derived_modifiers[data.stat || 'cha'];
        const dc = 8 + charData.derived_pb + mod + magicBonus;
        const badgeDiv = tmpl.querySelector('.save-badge');
        badgeDiv.classList.remove('hidden');
        tmpl.querySelector('.save-dc').textContent = dc;
        tmpl.querySelector('.save-stat').textContent = data.save_stat;
    }

    // 6. Actions
    tmpl.querySelector('.delete-btn').onclick = () => deleteEntry(index, category);
    tmpl.querySelector('.edit-btn').onclick = () => editEntry(index, category);

    return tmpl;
}

function setupSaveBadge(data, tmpl, magicBonus){
    const mod = charData.derived_modifiers[data.stat || 'cha'];
        const dc = 8 + charData.derived_pb + mod + magicBonus;
        const badgeDiv = tmpl.querySelector('.save-badge');
        badgeDiv.classList.remove('hidden');
        tmpl.querySelector('.save-dc').textContent = dc;
        tmpl.querySelector('.save-stat').textContent = data.save_stat;
}

function setupHitButton(tmpl, data, category) {
    const mod = charData.derived_modifiers[data.stat] || 0;
    const magicBonus = charData.magic_bonus || 0;
        let hit = mod;

    if (category === 'spell') hit += magicBonus;

    if (data.proficient !== false) {
        hit += charData.derived_pb;
    }
    
    const btn = tmpl.querySelector('.atk-btn');
    btn.classList.remove('hidden');
    tmpl.querySelector('.atk-bonus').textContent = `${(hit>=0?'+':'')+hit}`;
    btn.onclick = () => roll(hit, `${data.name} Attack`);
}

function renderInvocations() {
    const cont = document.getElementById('invocList');
    cont.innerHTML = '';
    if (!charData.invocations) return;
    charData.invocations.forEach((invoc, index) => {
        const tag = document.createElement('div');
        tag.className = 'invoc-tag';
        tag.innerHTML = `<span class="invoc-name">${invoc.name}</span><span class="invoc-desc">${invoc.desc}</span><span style="margin-left:5px; cursor:pointer; color:#ccc;" onclick="deleteInvoc(${index})">&times;</span>`;
        cont.appendChild(tag);
    });
}

function renderAttunement() {
    const cont = document.getElementById('attunementList');
    cont.innerHTML = '';
    if (!charData.attunement) charData.attunement = ["", "", ""];
    let used = 0;
    charData.attunement.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = `attunement-row ${item.trim() ? 'active' : ''}`;
        row.innerHTML = `<div class="attunement-icon">⚷</div><input type="text" class="dark-input" style="border:none; background:transparent; padding:0;" placeholder="Empty Slot..." value="${item}">`;
        row.querySelector('input').onchange = (e) => updateAttunement(index, e.target.value);
        if (item.trim()) used++;
        cont.appendChild(row);
    });
    const countEl = document.getElementById('attunementCount');
    countEl.innerText = `${used} / 3`;
    countEl.style.color = (used === 3) ? "#e17055" : "#888";
}

function renderFeats() {
    const cont = document.getElementById('featsList');
    cont.innerHTML = '';
    if (!charData.feats) return;
    charData.feats.forEach((feat, index) => {
        /*const tmpl = document.getElementById('feat-row-template').content.cloneNode(true);
        const link = tmpl.querySelector('.feat-name');
        link.textContent = feat.name;
        link.href = `http://dnd2024.wikidot.com/feat:${slugName(feat.name)}`;

        if (feat.source) {
            // Find item by name
            const parentItem = charData.inventory ? charData.inventory.find(i => i.name === feat.source) : null;
            
            if (parentItem) {
                // Item exists - Add "Via [Item]" label
                const noteEl = tmpl.querySelector('.feat-notes');
                // Prepend the source label to the notes
                const sourceLabel = `<span style="color:#ffeaa7; font-weight:bold; font-size:0.9em;">Via ${parentItem.name}</span>`;
                // We perform this injection after setting textContent below to avoid overwriting
            } else {
                // Item missing - Add "LOST" badge
                link.innerHTML = `<span class="missing-badge" style="background:#ff5252; color:white; font-size:0.7em; padding:2px 5px; border-radius:4px;">LOST</span> ` + feat.name;
                tmpl.querySelector('.list-card').classList.add('missing-source');
            }
        }

        tmpl.querySelector('.feat-notes').textContent = feat.notes;
        tmpl.querySelector('.delete-feat-btn').onclick = () => deleteFeat(index);*/

        cont.appendChild(createCardNew(feat, "feat", index));
    });
}

// Initial Boot
load();