/**
 * Z-Anatomy - 3D Human Anatomy Atlas
 * Main entry point
 */
import { SceneManager } from './engine/SceneManager.js';
import { ModelLoader } from './engine/ModelLoader.js';
import { CameraController } from './engine/CameraController.js';
import { RaycastPicker } from './engine/RaycastPicker.js';
import { CrossSection } from './engine/CrossSection.js';
import { LayerManager } from './data/LayerManager.js';
import { DescriptionLoader } from './data/DescriptionLoader.js';
import { TranslationManager } from './data/TranslationManager.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { InfoPanel } from './ui/InfoPanel.js';
import { SearchBar } from './ui/SearchBar.js';

class ZAnatomyApp {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');
        this.appContainer = document.getElementById('app');
        this.statusText = document.getElementById('status-text');
        this.meshCountEl = document.getElementById('mesh-count');
        this.canvas = document.getElementById('three-canvas');
    }

    async init() {
        try {
            // 1. Initialize 3D engine
            this._updateLoading(0, 'Initializing 3D engine...');
            this.sceneManager = new SceneManager(this.canvas);
            this.cameraController = new CameraController(
                this.sceneManager.camera,
                this.canvas
            );

            // 2. Initialize data managers
            this._updateLoading(0.02, 'Loading layer data...');
            this.layerManager = new LayerManager();
            this.descriptionLoader = new DescriptionLoader();
            this.translationManager = new TranslationManager();

            await Promise.all([
                this.layerManager.loadAll(),
                this.translationManager.load()
            ]);

            // 3. Load 3D models
            this.modelLoader = new ModelLoader(this.sceneManager.scene);
            await this.modelLoader.loadAll((progress, label) => {
                this._updateLoading(0.05 + progress * 0.9, `Loading ${label}...`);
            });

            // 4. Initialize cross-section
            this.crossSection = new CrossSection(
                this.sceneManager.scene,
                this.sceneManager.renderer
            );
            this.crossSection.setBounds(this.modelLoader.getRootGroup());

            // 5. Initialize interaction
            this._updateLoading(0.96, 'Setting up interactions...');
            this.picker = new RaycastPicker(
                this.sceneManager.camera,
                this.canvas,
                this.modelLoader.allMeshes
            );

            // 6. Initialize UI
            this._updateLoading(0.98, 'Preparing interface...');
            this._initUI();
            this._initToolbar();
            this._initCrossSection();

            // 7. Show app
            this._updateLoading(1, 'Ready!');
            setTimeout(() => {
                this.loadingScreen.style.opacity = '0';
                this.loadingScreen.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                    this.appContainer.classList.remove('hidden');
                }, 500);
            }, 300);

            this.statusText.textContent = 'Ready';
            this.meshCountEl.textContent = `${this.modelLoader.getMeshCount()} structures`;

            // 8. Start render loop
            this._animate();

        } catch (error) {
            console.error('Failed to initialize Z-Anatomy:', error);
            this.loadingText.textContent = `Error: ${error.message}`;
            this.loadingText.style.color = '#ef5350';
        }
    }

    _updateLoading(progress, text) {
        const pct = Math.round(progress * 100);
        this.loadingBar.style.width = `${pct}%`;
        this.loadingText.textContent = `${text} ${pct}%`;
    }

    _initUI() {
        // Layer panel
        this.layerPanel = new LayerPanel('layer-list', this.layerManager, this.modelLoader);
        this.layerPanel.render();

        // Depth slider handler — show/hide individual meshes by name
        this.layerPanel.onDepthChange((csvFile, depth, showParts, hideParts) => {
            showParts.forEach(name => {
                const entry = this.modelLoader.findMesh(name);
                if (entry) entry.mesh.visible = true;
            });
            hideParts.forEach(name => {
                const entry = this.modelLoader.findMesh(name);
                if (entry) entry.mesh.visible = false;
            });
        });

        // Info panel
        this.infoPanel = new InfoPanel(this.descriptionLoader);

        // Search bar
        this.searchBar = new SearchBar(this.modelLoader, this.cameraController);
        this.searchBar.onResultClick((data) => {
            if (data) {
                this.infoPanel.show(data);
                this.picker.clearSelection();
            }
        });

        // Selection handler
        this.picker.onSelect((data) => {
            if (data) {
                this.infoPanel.show(data);
                this.statusText.textContent = data.name;
            } else {
                this.infoPanel.hide();
                this.statusText.textContent = 'Ready';
            }
        });

        // Hide handler (right-click)
        this.picker.onHide((mesh) => {
            this.modelLoader.hideMesh(mesh);
            this.statusText.textContent = `Hidden: ${mesh.userData.originalName || mesh.name}`;
        });

        // Layer panel toggle
        const toggleBtn = document.getElementById('toggle-layers');
        const layerPanel = document.getElementById('layer-panel');
        toggleBtn.addEventListener('click', () => {
            layerPanel.classList.toggle('collapsed');
            const svg = toggleBtn.querySelector('svg');
            svg.style.transform = layerPanel.classList.contains('collapsed') ? 'rotate(180deg)' : '';
        });
    }

    _initToolbar() {
        // Reset camera
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.cameraController.reset();
            this.picker.clearSelection();
            this.infoPanel.hide();
        });

        // Show all hidden parts
        const showAllBtn = document.getElementById('btn-show-all');
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                const count = this.modelLoader.showAllHidden();
                this.statusText.textContent = count > 0
                    ? `Restored ${count} hidden part${count > 1 ? 's' : ''}`
                    : 'No hidden parts to restore';
            });
        }

        // Fullscreen
        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => { });
            } else {
                document.exitFullscreen();
            }
        });

        // Language selector
        const langToggle = document.getElementById('lang-toggle');
        const langDropdown = document.getElementById('lang-dropdown');
        const currentLangSpan = document.getElementById('current-lang');

        langToggle.addEventListener('click', () => {
            langDropdown.classList.toggle('hidden');
        });

        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                currentLangSpan.textContent = lang.toUpperCase();
                document.querySelectorAll('.lang-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                langDropdown.classList.add('hidden');

                this.descriptionLoader.setLanguage(lang);
                this.translationManager.setLanguage(lang);
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#language-selector')) {
                langDropdown.classList.add('hidden');
            }
        });
    }

    _initCrossSection() {
        const toggle = document.getElementById('cross-section-toggle');
        const controls = document.getElementById('cross-section-controls');
        const slider = document.getElementById('cross-section-slider');
        const axisButtons = document.querySelectorAll('.cs-axis-btn');
        const flipBtn = document.getElementById('cs-flip');

        if (!toggle || !slider) return;

        toggle.addEventListener('click', () => {
            const enabled = !this.crossSection.enabled;
            this.crossSection.setEnabled(enabled);
            toggle.classList.toggle('active', enabled);
            if (controls) controls.classList.toggle('hidden', !enabled);
        });

        slider.addEventListener('input', () => {
            this.crossSection.setPosition(parseFloat(slider.value));
        });

        axisButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                axisButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.crossSection.setAxis(btn.dataset.axis);
            });
        });

        if (flipBtn) {
            flipBtn.addEventListener('click', () => {
                this.crossSection.flip();
            });
        }
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        this.cameraController.update();
        this.sceneManager.render();
    }
}

const app = new ZAnatomyApp();
app.init();
