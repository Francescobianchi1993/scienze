import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * CameraController - Provides orbit, zoom, and pan camera controls
 */
export class CameraController {
    constructor(camera, canvas) {
        this.camera = camera;
        this.canvas = canvas;

        this.controls = new OrbitControls(camera, canvas);

        // Smooth damping
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;

        // Rotation
        this.controls.rotateSpeed = 0.8;

        // Zoom
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 1.2;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 20;

        // Pan
        this.controls.enablePan = true;
        this.controls.panSpeed = 0.8;

        // Vertical limits
        this.controls.maxPolarAngle = Math.PI * 0.95;
        this.controls.minPolarAngle = Math.PI * 0.05;

        // Default target — center of human body (mid-chest height)
        this.controls.target.set(0, 1.5, 0);
        this.camera.position.set(0, 1.5, 4.5);
        this.camera.lookAt(this.controls.target);

        // Store initial state for reset
        this._initialPosition = this.camera.position.clone();
        this._initialTarget = this.controls.target.clone();
    }

    update() {
        this.controls.update();
    }

    /**
     * Focus on a specific object with smooth transition
     */
    focusOn(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.5;

        this._animateTo(
            center.clone().add(new THREE.Vector3(distance * 0.5, distance * 0.3, distance)),
            center
        );
    }

    /**
     * Reset camera to initial view — centered on body mid-chest
     */
    reset() {
        this._animateTo(this._initialPosition.clone(), this._initialTarget.clone());
    }

    _animateTo(targetPosition, targetLookAt) {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 800;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);

            this.camera.position.lerpVectors(startPos, targetPosition, ease);
            this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
            this.controls.update();

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    dispose() {
        this.controls.dispose();
    }
}
