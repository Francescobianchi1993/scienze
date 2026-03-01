import * as THREE from 'three';

/**
 * CrossSection - Implements a clipping plane that can be moved through the model
 * to reveal internal anatomy. Works across all visible systems simultaneously.
 */
export class CrossSection {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.enabled = false;

        // Create three clipping planes (X, Y, Z)
        this.planes = {
            x: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10),
            y: new THREE.Plane(new THREE.Vector3(0, -1, 0), 10),
            z: new THREE.Plane(new THREE.Vector3(0, 0, -1), 10),
        };

        // Current active axis
        this.activeAxis = 'x';
        this.planeValue = 1.0; // 0..1 range mapped to model bounds

        // Model bounds (set after models load)
        this.bounds = { min: new THREE.Vector3(-2, 0, -2), max: new THREE.Vector3(2, 3, 2) };
    }

    /**
     * Set the model bounding box (call after models load).
     */
    setBounds(rootGroup) {
        const box = new THREE.Box3().setFromObject(rootGroup);
        this.bounds.min.copy(box.min);
        this.bounds.max.copy(box.max);
    }

    /**
     * Enable/disable cross-section clipping.
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.renderer.clippingPlanes = [this.planes[this.activeAxis]];
        } else {
            this.renderer.clippingPlanes = [];
        }
        this.renderer.localClippingEnabled = enabled;
    }

    /**
     * Set the active clipping axis: 'x', 'y', or 'z'.
     */
    setAxis(axis) {
        this.activeAxis = axis;
        if (this.enabled) {
            this.renderer.clippingPlanes = [this.planes[axis]];
        }
        this.updatePlane();
    }

    /**
     * Set the clipping position (0..1 normalized range).
     * 0 = fully clipped (plane at min), 1 = fully open (plane at max).
     */
    setPosition(normalizedValue) {
        this.planeValue = normalizedValue;
        this.updatePlane();
    }

    updatePlane() {
        const plane = this.planes[this.activeAxis];
        const min = this.bounds.min;
        const max = this.bounds.max;

        switch (this.activeAxis) {
            case 'x':
                plane.normal.set(-1, 0, 0);
                plane.constant = THREE.MathUtils.lerp(min.x, max.x, this.planeValue);
                break;
            case 'y':
                plane.normal.set(0, -1, 0);
                plane.constant = THREE.MathUtils.lerp(min.y, max.y, this.planeValue);
                break;
            case 'z':
                plane.normal.set(0, 0, -1);
                plane.constant = THREE.MathUtils.lerp(min.z, max.z, this.planeValue);
                break;
        }
    }

    /**
     * Flip the clipping direction.
     */
    flip() {
        const plane = this.planes[this.activeAxis];
        plane.normal.negate();
        plane.constant = -plane.constant;
    }

    dispose() {
        this.renderer.clippingPlanes = [];
        this.renderer.localClippingEnabled = false;
    }
}
