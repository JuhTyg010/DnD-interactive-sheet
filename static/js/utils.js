export class Utils {
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    static slugName(name) {
        return name.toLowerCase()
            .replace(/['’]/g, "-")
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
    }

    static getClone(templateId) {
        const tmpl = document.getElementById(templateId);
        if (!tmpl) {
            console.error(`Template ${templateId} not found`);
            return document.createElement('div');
        }
        return tmpl.content.cloneNode(true);
    }
}