import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { resolveAnatomyMaterial, isCrossSectionHelper, isArtifactMesh, isLabelLine } from '../data/AnatomyColorMap.js';

/**
 * ModelLoader - Loads FBX anatomy models with progress tracking.
 * Materials are resolved per-mesh using AnatomyColorMap hierarchy rules.
 * Each mesh gets its own material instance for independent selection highlighting.
 */

export const ANATOMY_SYSTEMS = [
    { id: 'skeletal', file: 'SkeletalSystem100.fbx', label: 'Skeletal System', color: '#e8d5b5', defaultOn: true },
    { id: 'muscular', file: 'MuscularSystem100.fbx', label: 'Muscular System', color: '#c85a28', defaultOn: true },
    { id: 'nervous', file: 'NervousSystem100.fbx', label: 'Nervous System', color: '#c8b832', defaultOn: false },
    { id: 'cardiovascular', file: 'CardioVascular41.fbx', label: 'Cardiovascular System', color: '#cc2020', defaultOn: false },
    { id: 'visceral', file: 'VisceralSystem100.fbx', label: 'Visceral System', color: '#c8a090', defaultOn: false },
    { id: 'joints', file: 'Joints100.fbx', label: 'Joints', color: '#b8ccd0', defaultOn: false },
    { id: 'lymphoid', file: 'LymphoidOrgans100.fbx', label: 'Lymphoid Organs', color: '#7a9a68', defaultOn: false },
    { id: 'regions', file: 'Regions of human body100.fbx', label: 'Body Regions', color: '#d4b498', defaultOn: false },
    { id: 'references', file: 'References100.fbx', label: 'References', color: '#8090a0', defaultOn: false },
];

export class ModelLoader {
    constructor(scene) {
        this.scene = scene;
        this.loader = new FBXLoader();
        this.models = new Map();
        this.allMeshes = [];
        this.meshNameMap = new Map();

        this.rootGroup = new THREE.Group();
        this.rootGroup.name = 'anatomy-root';
        this.scene.add(this.rootGroup);
    }

    async loadAll(onProgress) {
        const totalSystems = ANATOMY_SYSTEMS.length;

        for (let i = 0; i < totalSystems; i++) {
            const system = ANATOMY_SYSTEMS[i];
            const url = `/models/${system.file}`;

            try {
                const group = await this._loadFBX(url, (fileProgress) => {
                    const overallProgress = (i + fileProgress) / totalSystems;
                    onProgress?.(overallProgress, system.label);
                });

                this._processModel(group, system);
                this.models.set(system.id, group);
                this.rootGroup.add(group);

                if (!system.defaultOn) {
                    group.visible = false;
                }
            } catch (err) {
                console.warn(`Failed to load ${system.file}:`, err);
            }
        }

        this._applyGlobalTransform();
        onProgress?.(1, 'Complete');
    }

    _loadFBX(url, onProgress) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (object) => resolve(object),
                (xhr) => {
                    if (xhr.lengthComputable) {
                        onProgress?.(xhr.loaded / xhr.total);
                    }
                },
                (error) => reject(error)
            );
        });
    }

    _applyGlobalTransform() {
        const visibilityState = new Map();
        this.models.forEach((group, id) => {
            visibilityState.set(id, group.visible);
            group.visible = true;
        });

        const globalBox = new THREE.Box3().setFromObject(this.rootGroup);
        const size = new THREE.Vector3();
        globalBox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const targetHeight = 3.0;
            const scale = targetHeight / maxDim;
            this.rootGroup.scale.setScalar(scale);
        }

        const scaledBox = new THREE.Box3().setFromObject(this.rootGroup);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        this.rootGroup.position.x = -scaledCenter.x;
        this.rootGroup.position.z = -scaledCenter.z;
        this.rootGroup.position.y = -scaledBox.min.y;

        this.models.forEach((group, id) => {
            group.visible = visibilityState.get(id);
        });
    }

    /**
     * Process a loaded FBX group: tag meshes, apply materials,
     * hide label lines, cross-section helpers, and artifact meshes.
     */
    _processModel(group, system) {
        group.userData.systemId = system.id;
        group.userData.systemLabel = system.label;

        group.traverse((child) => {
            // Hide Line / LineSegments objects (FBX annotation pointers)
            if (child.isLine || child.isLineSegments) {
                child.visible = false;
                child.userData._hidden = true;
                return;
            }

            if (child.isMesh) {
                child.userData.systemId = system.id;
                child.userData.systemLabel = system.label;
                child.userData.originalName = child.name;

                // Hide cross-section helpers, artifact meshes, and label lines
                const isCSHelper = isCrossSectionHelper(child.name);
                const isArtifact = isArtifactMesh(child);
                const isLabel = isLabelLine(child);

                if (isCSHelper || isArtifact || isLabel) {
                    child.visible = false;
                    child.userData._hidden = true;
                    return;
                }

                // Apply correct material (each mesh gets own instance)
                child.material = resolveAnatomyMaterial(system.id, child);

                child.castShadow = false;
                child.receiveShadow = false;
                child.frustumCulled = true;

                // Body Regions skin: render last to avoid transparency holes
                if (system.id === 'regions') {
                    child.renderOrder = 1;
                }

                this.allMeshes.push(child);

                // Register mesh with multiple name variants for flexible lookup
                const cleanName = this._cleanMeshName(child.name);
                const normalizedName = this._normalizeName(child.name);

                this.meshNameMap.set(normalizedName, { mesh: child, systemId: system.id });
                if (cleanName !== normalizedName) {
                    this.meshNameMap.set(cleanName, { mesh: child, systemId: system.id });
                }
            }
        });
    }

    _cleanMeshName(name) {
        return name.replace(/\.\d+$/, '').trim();
    }

    /**
     * Normalize names for CSV↔FBX matching.
     */
    _normalizeName(name) {
        return name
            .replace(/\.\d+$/, '')
            .replace(/\s+/g, '_')
            .replace(/\.([lrg])$/i, '$1')
            .replace(/[()]/g, '')
            .trim();
    }

    /**
     * Find a mesh by name, trying multiple matching strategies.
     */
    findMesh(name) {
        let entry = this.meshNameMap.get(name);
        if (entry) return entry;

        const normalized = this._normalizeName(name);
        entry = this.meshNameMap.get(normalized);
        if (entry) return entry;

        const csvNormalized = name
            .replace(/\s+/g, '_')
            .replace(/\.([lrg])$/i, '$1')
            .replace(/[()]/g, '')
            .trim();
        entry = this.meshNameMap.get(csvNormalized);
        if (entry) return entry;

        // Case-insensitive fallback
        const lowerTarget = csvNormalized.toLowerCase();
        for (const [key, val] of this.meshNameMap) {
            if (key.toLowerCase() === lowerTarget) {
                return val;
            }
        }

        return null;
    }

    getMeshNames() {
        return Array.from(this.meshNameMap.keys());
    }

    setSystemVisible(systemId, visible) {
        const group = this.models.get(systemId);
        if (group) group.visible = visible;
    }

    hideMesh(mesh) {
        if (mesh) {
            mesh.visible = false;
            mesh.userData._userHidden = true;
        }
    }

    showAllHidden(systemId) {
        const targets = systemId
            ? this.allMeshes.filter(m => m.userData.systemId === systemId)
            : this.allMeshes;

        let count = 0;
        targets.forEach(m => {
            if (m.userData._userHidden) {
                m.visible = true;
                m.userData._userHidden = false;
                count++;
            }
        });
        return count;
    }

    setSystemOpacity(systemId, opacity) {
        const group = this.models.get(systemId);
        if (!group) return;

        group.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.opacity = opacity;
                child.material.transparent = opacity < 1.0;
                child.material.depthWrite = opacity >= 0.9;
                child.material.needsUpdate = true;
            }
        });
    }

    getMeshCount() {
        return this.allMeshes.length;
    }

    getRootGroup() {
        return this.rootGroup;
    }
}
