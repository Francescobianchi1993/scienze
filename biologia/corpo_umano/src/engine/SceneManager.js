import * as THREE from 'three';

/**
 * SceneManager - Sets up and manages the Three.js scene, renderer, and lighting.
 * Optimized for 5000+ mesh anatomy models: no shadow maps, simpler lighting.
 */
export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        this._initRenderer();
        this._initCamera();
        this._initLighting();
        this._initBackground();
        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize);
    }

    _initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        // Cap pixel ratio for performance (5000+ meshes)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Disable shadow maps entirely for performance
        this.renderer.shadowMap.enabled = false;

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    _initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.01,
            500
        );
        this.camera.position.set(0, 1.5, 4.5);
        this.camera.lookAt(0, 1.5, 0);
    }

    _initLighting() {
        // Warm ambient for base illumination — slightly stronger
        const ambient = new THREE.AmbientLight(0xdcd0c0, 0.8);
        this.scene.add(ambient);

        // Main key light — warm, strong, from front-right-above
        const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
        keyLight.position.set(3, 5, 4);
        this.scene.add(keyLight);

        // Fill light — cooler, softer, from left
        const fillLight = new THREE.DirectionalLight(0xc8d0e0, 0.5);
        fillLight.position.set(-4, 3, -1);
        this.scene.add(fillLight);

        // Hemisphere for natural sky/ground gradient tinting
        const hemiLight = new THREE.HemisphereLight(0xa0b8c8, 0x3a2820, 0.35);
        this.scene.add(hemiLight);
    }

    _initBackground() {
        // Dark grey matching Z-Anatomy's ~#303030
        this.scene.background = new THREE.Color(0x303030);
        this.scene.fog = new THREE.Fog(0x303030, 20, 60);
    }

    _onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this._onResize);
        this.renderer.dispose();
    }
}
