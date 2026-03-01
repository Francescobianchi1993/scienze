import { ANATOMY_SYSTEMS } from '../engine/ModelLoader.js';
import { LAYER_SLIDER_CONFIG } from '../data/LayerManager.js';

/**
 * LayerPanel - Creates and manages the layer toggle sidebar with depth sliders.
 *
 * Each system has a toggle switch + optional depth sliders for sub-layers
 * (e.g., Bones slider, Muscles slider under their parent system toggle).
 */
export class LayerPanel {
    constructor(containerId, layerManager, modelLoader) {
        this.container = document.getElementById(containerId);
        this.layerManager = layerManager;
        this.modelLoader = modelLoader;
        this._onChange = null;
        this._onDepthChange = null;
    }

    onChange(callback) {
        this._onChange = callback;
    }

    onDepthChange(callback) {
        this._onDepthChange = callback;
    }

    render() {
        this.container.innerHTML = '';

        ANATOMY_SYSTEMS.forEach(system => {
            const visible = system.defaultOn !== false;
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.dataset.systemId = system.id;

            item.innerHTML = `
        <div class="layer-color" style="background: ${system.color}"></div>
        <span class="layer-name">${system.label}</span>
        <button class="layer-toggle ${visible ? 'active' : ''}" data-system="${system.id}" title="Toggle ${system.label}"></button>
      `;

            // Toggle button
            const toggleBtn = item.querySelector('.layer-toggle');
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newState = !this.layerManager.isVisible(system.id);
                this.layerManager.setVisible(system.id, newState);
                toggleBtn.classList.toggle('active', newState);
                this.modelLoader.setSystemVisible(system.id, newState);
                this._onChange?.(system.id, newState);
            });

            // Click on item name to toggle too
            item.querySelector('.layer-name').addEventListener('click', () => {
                toggleBtn.click();
            });

            this.container.appendChild(item);

            // Add depth sliders for sub-layers belonging to this system
            const subLayers = LAYER_SLIDER_CONFIG.filter(s => s.systemId === system.id);
            subLayers.forEach(sub => {
                const maxDepth = this.layerManager.getMaxDepth(sub.csv);
                if (maxDepth <= 0) return; // skip if CSV wasn't loaded

                const sliderRow = document.createElement('div');
                sliderRow.className = 'layer-slider-row';
                sliderRow.innerHTML = `
          <span class="slider-label">${sub.label}</span>
          <input type="range" min="0" max="${maxDepth}" value="${maxDepth}"
                 class="depth-slider" data-csv="${sub.csv}" />
          <span class="slider-value">${maxDepth}</span>
        `;

                const slider = sliderRow.querySelector('.depth-slider');
                const valueLabel = sliderRow.querySelector('.slider-value');

                slider.addEventListener('input', () => {
                    const depth = parseInt(slider.value);
                    valueLabel.textContent = depth;
                    const { show, hide } = this.layerManager.setDepth(sub.csv, depth);
                    this._onDepthChange?.(sub.csv, depth, show, hide);
                });

                this.container.appendChild(sliderRow);
            });
        });
    }
}
