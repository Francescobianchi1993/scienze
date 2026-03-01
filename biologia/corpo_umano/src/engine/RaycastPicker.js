import * as THREE from 'three';

/**
 * RaycastPicker - Click-to-select and right-click-to-hide anatomy parts.
 * 
 * Selection behavior:
 * - Hover: light tint (different from selected)
 * - Click: strong highlight, stays until click elsewhere
 * - Right-click: hides the clicked part
 * - Moving cursor away from hovered part restores it
 */
export class RaycastPicker {
    constructor(camera, canvas, meshes) {
        this.camera = camera;
        this.canvas = canvas;
        this.meshes = meshes;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedMesh = null;
        this.hoveredMesh = null;

        // Store original emissive per mesh (by uuid)
        this.savedEmissive = new Map();

        // Colors
        this.selectColor = new THREE.Color(0x4FC3F7);
        this.hoverColor = new THREE.Color(0x81D4FA);

        this._onClick = this._onClick.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onSelect = null;
        this._onHide = null;

        canvas.addEventListener('click', this._onClick);
        canvas.addEventListener('mousemove', this._onMouseMove);
        canvas.addEventListener('contextmenu', this._onContextMenu);
    }

    onSelect(callback) { this._onSelect = callback; }
    onHide(callback) { this._onHide = callback; }

    _getNormalizedMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    _raycast(event) {
        this._getNormalizedMouse(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const visibleMeshes = this.meshes.filter(m =>
            m.visible && m.parent && this._isAncestorVisible(m)
        );

        const intersects = this.raycaster.intersectObjects(visibleMeshes, false);
        return intersects.length > 0 ? intersects[0].object : null;
    }

    _isAncestorVisible(obj) {
        let current = obj.parent;
        while (current) {
            if (!current.visible) return false;
            current = current.parent;
        }
        return true;
    }

    // --- Save / Restore emissive per-mesh ---

    _saveEmissive(mesh) {
        if (!this.savedEmissive.has(mesh.uuid)) {
            const mat = mesh.material;
            this.savedEmissive.set(mesh.uuid, {
                emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0),
                emissiveIntensity: mat.emissiveIntensity || 0
            });
        }
    }

    _setEmissive(mesh, color, intensity) {
        this._saveEmissive(mesh);
        const mat = mesh.material;
        if (mat.emissive) {
            mat.emissive.copy(color);
            mat.emissiveIntensity = intensity;
            mat.needsUpdate = true;
        }
    }

    _restoreEmissive(mesh) {
        const saved = this.savedEmissive.get(mesh.uuid);
        if (!saved) return;
        const mat = mesh.material;
        if (mat.emissive) {
            mat.emissive.copy(saved.emissive);
            mat.emissiveIntensity = saved.emissiveIntensity;
            mat.needsUpdate = true;
        }
        this.savedEmissive.delete(mesh.uuid);
    }

    // --- Events ---

    _onClick(event) {
        if (event.target !== this.canvas) return;

        const mesh = this._raycast(event);

        // Deselect previous
        if (this.selectedMesh && this.selectedMesh !== mesh) {
            this._restoreEmissive(this.selectedMesh);
        }

        if (mesh) {
            this.selectedMesh = mesh;
            this._setEmissive(mesh, this.selectColor, 0.5);

            this._onSelect?.({
                mesh,
                name: mesh.userData.originalName || mesh.name,
                systemId: mesh.userData.systemId,
                systemLabel: mesh.userData.systemLabel
            });
        } else {
            this.selectedMesh = null;
            this._onSelect?.(null);
        }
    }

    _onContextMenu(event) {
        if (event.target !== this.canvas) return;
        event.preventDefault();

        const mesh = this._raycast(event);
        if (mesh) {
            if (mesh === this.selectedMesh) {
                this._restoreEmissive(mesh);
                this.selectedMesh = null;
                this._onSelect?.(null);
            }
            if (mesh === this.hoveredMesh) {
                this.hoveredMesh = null;
            }
            this._onHide?.(mesh);
        }
    }

    _onMouseMove(event) {
        if (event.target !== this.canvas) return;

        const mesh = this._raycast(event);

        // Un-hover previous (only if it wasn't the selected one)
        if (this.hoveredMesh && this.hoveredMesh !== mesh && this.hoveredMesh !== this.selectedMesh) {
            this._restoreEmissive(this.hoveredMesh);
            this.hoveredMesh = null;
        }

        if (mesh && mesh !== this.selectedMesh) {
            this.hoveredMesh = mesh;
            this._setEmissive(mesh, this.hoverColor, 0.25);
            this.canvas.style.cursor = 'pointer';
        } else if (!mesh) {
            this.hoveredMesh = null;
            this.canvas.style.cursor = 'default';
        }
    }

    clearSelection() {
        if (this.selectedMesh) {
            this._restoreEmissive(this.selectedMesh);
            this.selectedMesh = null;
        }
        if (this.hoveredMesh) {
            this._restoreEmissive(this.hoveredMesh);
            this.hoveredMesh = null;
        }
        this._onSelect?.(null);
    }

    dispose() {
        this.canvas.removeEventListener('click', this._onClick);
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
        this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    }
}
