export class CharacterAPI {
    async loadCharacter() {
        const res = await fetch('/api/character');
        return await res.json();
    }

    async saveCharacter(data) {
        await fetch('/api/character', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
    }

    async rollDice(bonus, label) {
        const res = await fetch('/api/roll', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ bonus: bonus, label: label })
        });
        return await res.json();
    }

    async checkWikidot(targetUrl) {
        try {
            const res = await fetch('/api/check-wikidot', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ url: targetUrl })
            });
            const data = await res.json();
            return data.exists;
        } catch (error) {
            console.error("API Error:", error);
            return false;
        }
    }
}

export class LauncherAPI {
    async getList() {
        const res = await fetch('/api/launcher/list');
        return await res.json();
    }

    async selectCharacter(path) {
        await fetch('/api/launcher/select', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path: path })
        });
    }

    async browseSave() {
        const res = await fetch('/api/launcher/browse-save');
        return await res.json();
    }

    async createCharacter(name, path) {
        const res = await fetch('/api/launcher/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: name, path: path })
        });
        return await res.json();
    }

    async importCharacter() {
        const res = await fetch('/api/launcher/import');
        return await res.json();
    }

    async deleteCharacter(path) {
        const res = await fetch('/api/launcher/delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path: path })
        });
        return await res.json();
    }
}