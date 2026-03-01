/**
 * DescriptionLoader - Lazy-loads anatomy description files on demand.
 * 
 * Description files are stored as `/descriptions/{lang}/{name}.txt`.
 * File names use **spaces** (e.g., "Levator anguli oris.txt"), but FBX
 * mesh names use **underscores** (e.g., "Levator_anguli_oris"). This
 * loader handles the conversion automatically.
 */
export class DescriptionLoader {
    constructor() {
        this.cache = new Map();
        this.lang = 'en';
    }

    setLanguage(lang) {
        this.lang = lang;
        this.cache.clear();
    }

    /**
     * Load description for an anatomy part.
     * @param {string} name - Mesh name (FBX format with underscores)
     */
    async load(name) {
        const cleanName = this._cleanName(name);
        const cacheKey = `${this.lang}:${cleanName}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const langDir = this.lang === 'fr' ? 'fr' : 'en';

        // Convert FBX underscore name → description file name (spaces)
        const fileName = this._toFileName(cleanName);

        // Try multiple name variants
        const variants = [
            fileName,
            cleanName,                    // original (with underscores)
            cleanName.replace(/_/g, ' '), // spaces
        ];

        for (const variant of variants) {
            const url = `/descriptions/${langDir}/${variant}.txt`;
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const text = await response.text();
                    const parsed = this._parse(text, cleanName);
                    this.cache.set(cacheKey, parsed);
                    return parsed;
                }
            } catch {
                // try next variant
            }
        }

        return this._fallback(cleanName);
    }

    /**
     * Strip side indicators and trailing numbers from FBX name.
     */
    _cleanName(name) {
        return name
            .replace(/\.\d+$/, '')     // Remove .001 suffixes
            .replace(/\.([lr])$/i, '') // Remove .l/.r side indicators
            .replace(/([lr])$/i, '')   // Remove trailing l/r without dot
            .trim();
    }

    /**
     * Convert FBX underscore name to description file name format.
     * "Levator_anguli_oris" → "Levator anguli oris"
     */
    _toFileName(name) {
        return name.replace(/_/g, ' ').trim();
    }

    _parse(text, fallbackTitle) {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        let title = fallbackTitle;
        let content = '';
        let wikiUrl = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('!')) continue;
            if (line.startsWith('http')) {
                wikiUrl = line;
                continue;
            }
            if (line === line.toUpperCase() && line.length > 2 && !line.startsWith('==')) {
                title = this._titleCase(line);
                continue;
            }
            if (line.startsWith('==')) {
                const sectionTitle = line.replace(/=/g, '').trim();
                content += `\n### ${sectionTitle}\n`;
                continue;
            }
            content += line + ' ';
        }

        if (!wikiUrl) {
            const lastLine = lines[lines.length - 1]?.trim() || '';
            if (lastLine.startsWith('http')) {
                wikiUrl = lastLine;
            }
        }

        const paragraphs = content.trim().split(/\n\n+/);
        const displayContent = paragraphs.slice(0, 3).join('\n\n');

        return {
            title: this._titleCase(title.replace(/_/g, ' ')),
            content: displayContent || 'No description available.',
            fullContent: content.trim(),
            wikiUrl
        };
    }

    _titleCase(str) {
        return str.toLowerCase().split(' ').map(w =>
            w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
    }

    _fallback(name) {
        return {
            title: this._titleCase(name.replace(/[._-]/g, ' ')),
            content: 'Description not available for this structure.',
            fullContent: '',
            wikiUrl: null
        };
    }
}
