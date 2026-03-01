/**
 * SearchBar - Search anatomy parts with fuzzy matching and autocomplete
 */
export class SearchBar {
    constructor(modelLoader, cameraController) {
        this.modelLoader = modelLoader;
        this.cameraController = cameraController;

        this.input = document.getElementById('search-input');
        this.resultsContainer = document.getElementById('search-results');
        this.selectedIndex = -1;
        this._onResultClick = null;

        this._bindEvents();
    }

    onResultClick(callback) {
        this._onResultClick = callback;
    }

    _bindEvents() {
        // Input handler with debounce
        let debounceTimer;
        this.input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this._search(), 150);
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            const items = this.resultsContainer.querySelectorAll('.search-result-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                this._updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this._updateSelection(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                    items[this.selectedIndex].click();
                }
            } else if (e.key === 'Escape') {
                this._hideResults();
                this.input.blur();
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#search-container')) {
                this._hideResults();
            }
        });

        this.input.addEventListener('focus', () => {
            if (this.input.value.length >= 2) {
                this._search();
            }
        });
    }

    _search() {
        const query = this.input.value.trim().toLowerCase();
        if (query.length < 2) {
            this._hideResults();
            return;
        }

        const meshNames = this.modelLoader.getMeshNames();
        const results = this._fuzzyMatch(meshNames, query, 15);

        if (results.length === 0) {
            this.resultsContainer.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">No results found</div>';
            this._showResults();
            return;
        }

        this.selectedIndex = -1;
        this.resultsContainer.innerHTML = results.map((r, i) => {
            const entry = this.modelLoader.findMesh(r.name);
            const systemLabel = entry?.systemId || '';
            return `<div class="search-result-item" data-name="${r.name}" data-index="${i}">
        ${this._highlightMatch(r.name, query)}
        ${systemLabel ? `<span class="system-tag" style="background:rgba(79,195,247,0.15);color:var(--accent-blue)">${systemLabel}</span>` : ''}
      </div>`;
        }).join('');

        // Bind click events to results
        this.resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.dataset.name;
                if (!name) return;

                this.input.value = name;
                this._hideResults();

                const entry = this.modelLoader.findMesh(name);
                if (entry?.mesh) {
                    this.cameraController.focusOn(entry.mesh);
                    this._onResultClick?.({
                        mesh: entry.mesh,
                        name: entry.mesh.userData.originalName || name,
                        systemId: entry.systemId,
                        systemLabel: entry.mesh.userData.systemLabel || ''
                    });
                }
            });
        });

        this._showResults();
    }

    _fuzzyMatch(names, query, limit) {
        const scored = [];

        for (const name of names) {
            const lower = name.toLowerCase();
            let score = 0;

            if (lower === query) {
                score = 100;
            } else if (lower.startsWith(query)) {
                score = 80;
            } else if (lower.includes(query)) {
                score = 60;
            } else {
                // Simple fuzzy: check if all query chars appear in order
                let qi = 0;
                for (let i = 0; i < lower.length && qi < query.length; i++) {
                    if (lower[i] === query[qi]) qi++;
                }
                if (qi === query.length) {
                    score = 30;
                }
            }

            if (score > 0) {
                scored.push({ name, score });
            }
        }

        scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        return scored.slice(0, limit);
    }

    _highlightMatch(name, query) {
        const idx = name.toLowerCase().indexOf(query);
        if (idx >= 0) {
            return name.substring(0, idx) +
                `<strong style="color:var(--accent-blue)">${name.substring(idx, idx + query.length)}</strong>` +
                name.substring(idx + query.length);
        }
        return name;
    }

    _showResults() {
        this.resultsContainer.classList.add('active');
    }

    _hideResults() {
        this.resultsContainer.classList.remove('active');
        this.selectedIndex = -1;
    }

    _updateSelection(items) {
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === this.selectedIndex);
        });
        if (items[this.selectedIndex]) {
            items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}
