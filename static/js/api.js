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