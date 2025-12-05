import { CharacterAPI } from './api.js';
import { CharacterState } from './state.js';
import { SheetRenderer } from './renderer.js';
import { ModalHandler } from './modals.js';

class App {
    constructor() {
        this.api = new CharacterAPI();
        
        // Pass the render function as a callback to State
        this.state = new CharacterState(this.api, () => this.renderer.renderAll());
        
        this.renderer = new SheetRenderer(this.state, this.api);
        this.modals = new ModalHandler(this.state);

        // Tooltip logic
        this.setupTooltips();
    }

    async init() {
        await this.state.load();
    }

    // --- MAPPING METHODS FOR HTML ONCLICK ---
    // These link the HTML buttons to the internal class logic
    
    async roll(bonus, label) {
        const result = await this.api.rollDice(bonus, label);
        this.renderer.addLogEntry(result);
    }

    deleteEntry(index, category) {
        if(confirm(`Remove ${category}?`)) {
            this.state.deleteItem(index, category);
        }
    }
    
    // Pass-through for simple updates called directly from HTML
    updateVal(k, v) { this.state.updateVal(k, v); }
    updateText(k, v) { this.state.updateText(k, v); }
    updateDeathSave() { 
        // Read DOM directly here as it's UI specific logic
        let s = 0, f = 0;
        if(document.getElementById('ds-succ-1').checked) s++;
        if(document.getElementById('ds-succ-2').checked) s++;
        if(document.getElementById('ds-succ-3').checked) s++;
        if(document.getElementById('ds-fail-1').checked) f++;
        if(document.getElementById('ds-fail-2').checked) f++;
        if(document.getElementById('ds-fail-3').checked) f++;
        this.state.updateDeathSave(s, f);
    }

    setupTooltips() {
        document.addEventListener('mouseover', (e) => {
            const tag = e.target.closest('.invoc-tag');
            if (!tag || e.target.closest('.invoc-desc')) return;

            const tooltip = tag.querySelector('.invoc-desc');
            if (!tooltip) return;

            // Reset
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translateX(-50%) translateY(-15px)';

            const rect = tooltip.getBoundingClientRect();
            if (rect.left < 10) { 
                tooltip.style.left = '0'; 
                tooltip.style.transform = 'translateY(-15px)'; 
            } 
            else if (rect.right > window.innerWidth - 10) {
                tooltip.style.left = 'auto'; 
                tooltip.style.right = '0'; 
                tooltip.style.transform = 'translateY(-15px)';
            }
        });
    }
}

// --- INITIALIZATION ---
// Create global instance so HTML onclick="window.app.xxx" works
window.app = new App();
window.addEventListener('DOMContentLoaded', () => window.app.init());

// Expose modal helper globals if your HTML calls them directly
// (Ideally, update HTML to use window.app.modals.method)
window.openAddAttack = (mode) => window.app.modals.openAdd(mode);
window.commitAction = () => window.app.modals.commit();
window.toggleSaveInput = () => { /* Add logic to ModalHandler if needed, or keep inline */ 
    const type = document.getElementById('newAtkType')?.value || document.getElementById('actType')?.value;
    const saveInput = document.getElementById('newAtkTargetSave') || document.getElementById('actSaveTarget');
    if(!saveInput) return;
    if (type === 'spell_save') saveInput.classList.remove('hidden');
    else saveInput.classList.add('hidden');
};
window.updateModalView = () => {
    const type = document.getElementById('actType').value;
    const lvlInput = document.getElementById('actLevel');
    if(!lvlInput) return;
    if (type.startsWith('weapon') || type === 'item') lvlInput.style.visibility = 'hidden';
    else lvlInput.style.visibility = 'visible';
};
window.commitFeat = () => window.app.modals.commitFeat();
window.openAddFeat = () => window.app.modals.openAddFeat();
window.commitInvoc = () => window.app.modals.commitInvoc();
window.renderAttacksAndItems = () => window.app.renderer.renderLists(window.app.state.data);
// Remap simple update functions
window.updateVal = (k, v) => window.app.updateVal(k, v);
window.updateText = (k, v) => window.app.updateText(k, v);
window.updateDeathSave = () => window.app.updateDeathSave();