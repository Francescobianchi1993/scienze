/**
 * TranslationManager - Handles multilingual labels
 */
export class TranslationManager {
    constructor() {
        this.translations = new Map();
        this.currentLang = 'en';
    }

    async load() {
        try {
            const response = await fetch('/translations/Translations0.txt');
            if (!response.ok) return;

            const text = await response.text();
            this._parse(text);
        } catch (e) {
            console.warn('Could not load translations:', e);
        }
    }

    _parse(text) {
        const lines = text.split('\n');
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const en = parts[0]?.trim();
                const translated = parts[1]?.trim();
                if (en && translated) {
                    this.translations.set(en, translated);
                }
            }
        }
    }

    setLanguage(lang) {
        this.currentLang = lang;
    }

    translate(name) {
        if (this.currentLang === 'en') return name;
        return this.translations.get(name) || name;
    }
}
