import { ANATOMY_SYSTEMS } from '../engine/ModelLoader.js';

/**
 * InfoPanel - Shows anatomy part details when selected
 */
export class InfoPanel {
    constructor(descriptionLoader) {
        this.panel = document.getElementById('info-panel');
        this.titleEl = document.getElementById('info-title');
        this.bodyEl = document.getElementById('info-body');
        this.closeBtn = document.getElementById('close-info');
        this.descriptionLoader = descriptionLoader;

        this.closeBtn.addEventListener('click', () => this.hide());
    }

    /**
     * Show info for selected mesh
     * @param {{name: string, systemId: string, systemLabel: string}} data
     */
    async show(data) {
        if (!data) {
            this.hide();
            return;
        }

        this.panel.classList.remove('hidden');

        // Show loading state
        this.titleEl.textContent = data.name;
        this.bodyEl.innerHTML = '<p class="info-placeholder">Loading...</p>';

        // Get system color
        const system = ANATOMY_SYSTEMS.find(s => s.id === data.systemId);
        const color = system?.color || '#607D8B';

        // Load description
        const desc = await this.descriptionLoader.load(data.name);

        this.titleEl.textContent = desc.title;

        let html = `
      <div class="info-system-badge" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44;">
        ${data.systemLabel}
      </div>
    `;

        // Content
        if (desc.content) {
            const paragraphs = desc.content.split('\n').filter(p => p.trim());
            paragraphs.forEach(p => {
                if (p.startsWith('### ')) {
                    html += `<h3>${p.replace('### ', '')}</h3>`;
                } else {
                    html += `<p class="desc-text">${this._truncate(p, 500)}</p>`;
                }
            });
        }

        // Wikipedia link
        if (desc.wikiUrl) {
            html += `
        <h3>Reference</h3>
        <p><a href="${desc.wikiUrl}" target="_blank" rel="noopener">
          📖 Read more on Wikipedia →
        </a></p>
      `;
        }

        this.bodyEl.innerHTML = html;
    }

    hide() {
        this.panel.classList.add('hidden');
    }

    _truncate(text, maxLen) {
        if (text.length <= maxLen) return text;
        return text.substring(0, maxLen).trim() + '…';
    }
}
