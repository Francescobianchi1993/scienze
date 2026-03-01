import { ANATOMY_SYSTEMS } from '../engine/ModelLoader.js';

/**
 * LayerManager - Parses CSV layer files and manages layer visibility state.
 * Supports depth-based visibility via column sliders.
 *
 * CSV format: each column = 1 depth layer (e.g., Muscles-1 ... Muscles-10).
 * Row cells within a column list the anatomy parts visible at that depth.
 */

/** Maps CSV filenames to system IDs */
const CSV_TO_SYSTEM = {
    'Collections - Bones.csv': 'skeletal',
    'Collections - Muscles.csv': 'muscular',
    'Collections - Nerves.csv': 'nervous',
    'Collections - Arteries.csv': 'cardiovascular',
    'Collections - Veins.csv': 'cardiovascular',
    'Collections - Viscera.csv': 'visceral',
    'Collections - Joints.csv': 'joints',
    'Collections - Ligaments.csv': 'joints',
    'Collections - Fasciae.csv': 'muscular',
    'Collections - Lymph.csv': 'lymphoid',
    'Collections - Skin.csv': 'regions',
    'Collections - Group-Muscles.csv': 'muscular',
    'Collections - Group-Nerve.csv': 'nervous',
    'Collections - Refs.csv': 'references',
    'Collections - BONUS.csv': 'references',
};

/**
 * For UI display — which CSV files get their own depth slider
 * and in what order they appear under each system toggle.
 */
export const LAYER_SLIDER_CONFIG = [
    { csv: 'Collections - Bones.csv', systemId: 'skeletal', label: 'Bones' },
    { csv: 'Collections - Muscles.csv', systemId: 'muscular', label: 'Muscles' },
    { csv: 'Collections - Fasciae.csv', systemId: 'muscular', label: 'Fasciae' },
    { csv: 'Collections - Ligaments.csv', systemId: 'joints', label: 'Ligaments' },
    { csv: 'Collections - Arteries.csv', systemId: 'cardiovascular', label: 'Arteries' },
    { csv: 'Collections - Veins.csv', systemId: 'cardiovascular', label: 'Veins' },
    { csv: 'Collections - Nerves.csv', systemId: 'nervous', label: 'Nerves' },
    { csv: 'Collections - Viscera.csv', systemId: 'visceral', label: 'Viscera' },
    { csv: 'Collections - Lymph.csv', systemId: 'lymphoid', label: 'Lymph' },
    { csv: 'Collections - Skin.csv', systemId: 'regions', label: 'Skin' },
    { csv: 'Collections - Refs.csv', systemId: 'references', label: 'References' },
];

export class LayerManager {
    constructor() {
        this.layers = new Map();     // csvFileName -> { systemId, depthColumns: string[][] }
        this.visibility = new Map(); // systemId -> boolean
        this.opacity = new Map();    // systemId -> number
        this.depthValues = new Map(); // csvFileName -> currentDepth (int)

        // Initialize visibility state (respects defaultOn from ANATOMY_SYSTEMS)
        ANATOMY_SYSTEMS.forEach(sys => {
            this.visibility.set(sys.id, sys.defaultOn !== false);
            this.opacity.set(sys.id, 1.0);
        });
    }

    /**
     * Load and parse all CSV layer files
     */
    async loadAll() {
        const csvFiles = Object.keys(CSV_TO_SYSTEM);

        await Promise.all(csvFiles.map(async (file) => {
            try {
                const url = `/layers/${file}`;
                const response = await fetch(url);
                if (!response.ok) return;

                const text = await response.text();
                const depthColumns = this._parseCSVColumns(text);
                this.layers.set(file, {
                    systemId: CSV_TO_SYSTEM[file],
                    depthColumns,
                    parts: depthColumns.flat() // flat list for backward compat
                });
                // Default: all layers visible (maxDepth)
                this.depthValues.set(file, depthColumns.length);
            } catch (e) {
                console.warn(`Could not load layer file: ${file}`, e);
            }
        }));
    }

    /**
     * Parse CSV into an array of columns (depth levels).
     * Column 0 = shallowest layer, last column = deepest.
     * Each column is an array of part names.
     */
    _parseCSVColumns(text) {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) return [];

        // First line is header: Bones-1, Bones-2, ...
        const header = lines[0].split(',');
        const numCols = header.length;
        const columns = Array.from({ length: numCols }, () => []);

        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',');
            for (let c = 0; c < numCols; c++) {
                const name = (cells[c] || '').trim().replace(/\r/g, '');
                if (name && name !== '') {
                    columns[c].push(name);
                }
            }
        }

        // Filter out empty columns
        return columns.filter(col => col.length > 0);
    }

    /**
     * Get the number of depth levels for a CSV file.
     */
    getMaxDepth(csvFile) {
        const layer = this.layers.get(csvFile);
        return layer ? layer.depthColumns.length : 0;
    }

    /**
     * Get current depth value for a CSV file.
     */
    getCurrentDepth(csvFile) {
        return this.depthValues.get(csvFile) ?? this.getMaxDepth(csvFile);
    }

    /**
     * Set depth level for a CSV file. Returns an object with
     * { show: string[], hide: string[] } part names.
     */
    setDepth(csvFile, depth) {
        const layer = this.layers.get(csvFile);
        if (!layer) return { show: [], hide: [] };

        this.depthValues.set(csvFile, depth);

        const show = [];
        const hide = [];

        for (let i = 0; i < layer.depthColumns.length; i++) {
            if (i < depth) {
                show.push(...layer.depthColumns[i]);
            } else {
                hide.push(...layer.depthColumns[i]);
            }
        }

        return { show, hide };
    }

    /**
     * Get all visible parts at the current depth for a CSV file.
     */
    getVisibleParts(csvFile) {
        const layer = this.layers.get(csvFile);
        if (!layer) return [];
        const depth = this.getCurrentDepth(csvFile);
        const parts = [];
        for (let i = 0; i < Math.min(depth, layer.depthColumns.length); i++) {
            parts.push(...layer.depthColumns[i]);
        }
        return parts;
    }

    /**
     * Get all anatomy part names from all layers
     */
    getAllParts() {
        const all = new Set();
        this.layers.forEach(({ parts }) => {
            parts.forEach(p => all.add(p));
        });
        return Array.from(all);
    }

    /**
     * Find which system a part belongs to
     */
    findSystem(partName) {
        for (const [, layer] of this.layers) {
            if (layer.parts.includes(partName)) {
                return layer.systemId;
            }
        }
        return null;
    }

    isVisible(systemId) {
        return this.visibility.get(systemId) ?? true;
    }

    setVisible(systemId, visible) {
        this.visibility.set(systemId, visible);
    }

    getOpacity(systemId) {
        return this.opacity.get(systemId) ?? 1.0;
    }

    setOpacity(systemId, value) {
        this.opacity.set(systemId, value);
    }
}
