import { LauncherAPI } from './api.js';
import { Utils } from './utils.js';

class Launcher {
    constructor() {
        this.api = new LauncherAPI();
        this.bindEvents();
        this.loadList();
    }

    bindEvents() {
        document.getElementById('btnShowCreate').onclick = () => this.showCreate();
        document.getElementById('btnImport').onclick = () => this.importChar();
        document.getElementById('btnBrowse').onclick = () => this.browseSave();
        document.getElementById('btnCancelCreate').onclick = () => this.hideCreate();
        document.getElementById('btnConfirmCreate').onclick = () => this.doCreate();
    }

    async loadList() {
        const list = await this.api.getList();
        const container = document.getElementById('charList');
        container.innerHTML = '';
        
        if(list.length === 0) {
            container.innerHTML = '<div class="text-gray text-center" style="padding:20px;">No characters found.<br>Create or Import one.</div>';
            return;
        }

        list.forEach(char => {
            const tmpl = Utils.getClone('launcher-row-template');
            
            tmpl.querySelector('.char-name').textContent = char.name;
            tmpl.querySelector('.char-path').textContent = char.path;
            
            const rowDiv = tmpl.querySelector('.char-row');
            rowDiv.onclick = () => this.selectChar(char.path);
            
            container.appendChild(tmpl);
        });
    }

    async selectChar(path) {
        await this.api.selectCharacter(path);
        window.location.href = '/sheet'; 
    }

    async browseSave() {
        const data = await this.api.browseSave();
        if(data.path) {
            document.getElementById('newPath').value = data.path;
        }
    }

    async doCreate() {
        const name = document.getElementById('newName').value;
        const path = document.getElementById('newPath').value;
        
        if(!name || !path) return alert("Please fill in a Name and select a File Location.");

        const data = await this.api.createCharacter(name, path);
        
        if(data.status === 'ok') {
            window.location.href = '/sheet';
        } else {
            alert(data.error);
        }
    }

    async importChar() {
        const data = await this.api.importCharacter();
        if(data.status === 'ok') this.loadList();
    }

    showCreate() {
        document.getElementById('createForm').classList.remove('hidden');
        document.getElementById('charList').classList.add('hidden');
    }

    hideCreate() {
        document.getElementById('createForm').classList.add('hidden');
        document.getElementById('charList').classList.remove('hidden');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Launcher();
});