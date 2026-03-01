import * as THREE from 'three';

/**
 * AnatomyColorMap — Maps FBX hierarchy group names to anatomically-accurate
 * material properties. Each mesh gets its OWN material instance to allow
 * independent highlight/selection (no shared material side-effects).
 */

const MATERIAL_PRESETS = {
    // ── Skeletal ──────────────────────────────────────────
    bone: { color: '#e8d5b5', roughness: 0.55, metalness: 0.05 },
    boneJoint: { color: '#dccfb8', roughness: 0.50, metalness: 0.05 },
    cartilage: { color: '#9ec5c5', roughness: 0.45, metalness: 0.00 },
    costalCart: { color: '#8fbcb0', roughness: 0.40, metalness: 0.00 },
    tooth: { color: '#f0e8d8', roughness: 0.30, metalness: 0.05 },

    // ── Muscular ─────────────────────────────────────────
    muscle: { color: '#c85a28', roughness: 0.65, metalness: 0.08 },
    muscleHead: { color: '#c0603a', roughness: 0.60, metalness: 0.06 },
    tendon: { color: '#d9cbb8', roughness: 0.50, metalness: 0.02 },
    tendonSheath: { color: '#c8bda5', roughness: 0.45, metalness: 0.00, opacity: 0.85, transparent: true },
    fascia: { color: '#d4c8b0', roughness: 0.40, metalness: 0.00, opacity: 0.7, transparent: true },
    bursa: { color: '#c0b090', roughness: 0.35, metalness: 0.00, opacity: 0.6, transparent: true },
    diaphragm: { color: '#b84830', roughness: 0.60, metalness: 0.08 },

    // ── Nervous ──────────────────────────────────────────
    nerve: { color: '#c8b832', roughness: 0.55, metalness: 0.05 },
    brain: { color: '#d8b898', roughness: 0.60, metalness: 0.02 },
    spinalCord: { color: '#c8a878', roughness: 0.55, metalness: 0.03 },

    // ── Cardiovascular ───────────────────────────────────
    artery: { color: '#cc2020', roughness: 0.45, metalness: 0.15 },
    vein: { color: '#3848a8', roughness: 0.45, metalness: 0.12 },
    heart: { color: '#8b1a1a', roughness: 0.50, metalness: 0.20 },

    // ── Visceral ─────────────────────────────────────────
    lung: { color: '#d8a0a0', roughness: 0.55, metalness: 0.03 },
    liver: { color: '#8b4513', roughness: 0.55, metalness: 0.08 },
    stomach: { color: '#d8a088', roughness: 0.50, metalness: 0.05 },
    intestine: { color: '#d8b8a0', roughness: 0.50, metalness: 0.05 },
    kidney: { color: '#a05040', roughness: 0.55, metalness: 0.08 },
    bladder: { color: '#c8a088', roughness: 0.50, metalness: 0.05 },
    spleen: { color: '#704050', roughness: 0.55, metalness: 0.08 },
    pancreas: { color: '#c8a878', roughness: 0.50, metalness: 0.05 },
    esophagus: { color: '#c89878', roughness: 0.50, metalness: 0.04 },
    trachea: { color: '#c8a898', roughness: 0.45, metalness: 0.03 },
    thyroid: { color: '#a85858', roughness: 0.50, metalness: 0.05 },
    adrenal: { color: '#c89060', roughness: 0.55, metalness: 0.05 },
    uterus: { color: '#c88888', roughness: 0.50, metalness: 0.05 },
    prostate: { color: '#b89080', roughness: 0.50, metalness: 0.05 },
    viscDefault: { color: '#c8a090', roughness: 0.50, metalness: 0.05 },

    // ── Joints ───────────────────────────────────────────
    joint: { color: '#b8ccd0', roughness: 0.35, metalness: 0.02, opacity: 0.85, transparent: true },
    ligament: { color: '#c0c8b0', roughness: 0.45, metalness: 0.02 },

    // ── Lymphoid ─────────────────────────────────────────
    lymphNode: { color: '#7a9a68', roughness: 0.55, metalness: 0.05 },
    lymphVessel: { color: '#88a878', roughness: 0.50, metalness: 0.03 },
    thymus: { color: '#9a8a70', roughness: 0.55, metalness: 0.05 },
    tonsil: { color: '#a08868', roughness: 0.55, metalness: 0.05 },
    spleenLymph: { color: '#704050', roughness: 0.55, metalness: 0.08 },

    // ── Body Regions ─────────────────────────────────────
    // Two presets: one with vertex colors, one without (plain skin tone)
    skinWithVC: { color: '#ffffff', roughness: 0.50, metalness: 0.00, opacity: 0.45, transparent: true, depthWrite: false, useVertexColors: true },
    skinNoVC: { color: '#d4b498', roughness: 0.50, metalness: 0.00, opacity: 0.45, transparent: true, depthWrite: false },

    // ── References ───────────────────────────────────────
    refPlane: { color: '#b0c0d0', roughness: 0.50, metalness: 0.05, opacity: 0.15, transparent: true, depthWrite: false },
    refLine: { color: '#90a8c0', roughness: 0.50, metalness: 0.05, opacity: 0.3, transparent: true, depthWrite: false },

    // ── Fallback ─────────────────────────────────────────
    fallback: { color: '#b0a890', roughness: 0.50, metalness: 0.05 },
};


const SYSTEM_RULES = {
    skeletal: [
        { match: nameIncludes('Costal_cartilage'), preset: 'costalCart' },
        { match: nameIncludes('cartilage'), preset: 'cartilage' },
        { match: nameIncludes('Teeth', 'tooth', 'incisor', 'canine', 'molar', 'premolar'), preset: 'tooth' },
        { match: nameEndsWith('j'), preset: 'boneJoint' },
        { match: () => true, preset: 'bone' },
    ],

    muscular: [
        { match: nameIncludes('Fasciae', 'fascia', 'Fascia'), preset: 'fascia' },
        { match: nameIncludes('Bursa', 'bursae'), preset: 'bursa' },
        { match: nameIncludes('Tendon_sheath'), preset: 'tendonSheath' },
        { match: nameIncludes('tendon', 'Tendon'), preset: 'tendon' },
        { match: nameIncludes('Diaphragm'), preset: 'diaphragm' },
        { match: nameIncludes('Cranial', 'Muscles_of_head', 'facial', 'Muscles_of_neck', 'Cervical'), preset: 'muscleHead' },
        { match: () => true, preset: 'muscle' },
    ],

    nervous: [
        { match: nameIncludes('Brain', 'Cerebr', 'Telencephalon', 'Diencephalon', 'Cerebellum', 'whole_brain'), preset: 'brain' },
        { match: nameIncludes('Spinal_cord', 'Medulla'), preset: 'spinalCord' },
        { match: () => true, preset: 'nerve' },
    ],

    cardiovascular: [
        { match: nameIncludes('Venous_system', 'vein', 'Vein', 'vena', 'Vena', 'venous'), preset: 'vein' },
        { match: nameIncludes('Heart', 'heart', 'Atrium', 'Ventricle', 'cardiac', 'Cardiac', 'Pericardium'), preset: 'heart' },
        { match: () => true, preset: 'artery' },
    ],

    visceral: [
        { match: nameIncludes('Lung', 'lung', 'Bronch', 'bronch', 'Pleura'), preset: 'lung' },
        { match: nameIncludes('Liver', 'liver', 'hepat', 'Hepat'), preset: 'liver' },
        { match: nameIncludes('Stomach', 'stomach', 'Gastric', 'gastric'), preset: 'stomach' },
        { match: nameIncludes('Intestin', 'intestin', 'Colon', 'colon', 'Duodenum', 'Jejunum', 'Ileum', 'Sigmoid', 'Rectum', 'Appendix', 'Cecum', 'cecum'), preset: 'intestine' },
        { match: nameIncludes('Kidney', 'kidney', 'renal', 'Renal', 'Nephron'), preset: 'kidney' },
        { match: nameIncludes('Bladder', 'bladder', 'Ureter', 'ureter', 'Urethra'), preset: 'bladder' },
        { match: nameIncludes('Spleen', 'spleen', 'splenic', 'Splenic'), preset: 'spleen' },
        { match: nameIncludes('Pancreas', 'pancrea'), preset: 'pancreas' },
        { match: nameIncludes('Esophag', 'esophag', 'Oesophag'), preset: 'esophagus' },
        { match: nameIncludes('Trachea', 'trachea', 'Larynx', 'larynx', 'Pharynx', 'pharynx'), preset: 'trachea' },
        { match: nameIncludes('Thyroid', 'thyroid', 'Parathyroid'), preset: 'thyroid' },
        { match: nameIncludes('Adrenal', 'adrenal', 'Suprarenal'), preset: 'adrenal' },
        { match: nameIncludes('Uterus', 'uterus', 'Ovary', 'ovary', 'Vagina', 'Fallopian'), preset: 'uterus' },
        { match: nameIncludes('Prostate', 'prostate', 'Testis', 'testis', 'Epididymis'), preset: 'prostate' },
        { match: () => true, preset: 'viscDefault' },
    ],

    joints: [
        { match: nameIncludes('Ligament', 'ligament'), preset: 'ligament' },
        { match: () => true, preset: 'joint' },
    ],

    lymphoid: [
        { match: nameIncludes('Thymus', 'thymus'), preset: 'thymus' },
        { match: nameIncludes('Tonsil', 'tonsil'), preset: 'tonsil' },
        { match: nameIncludes('Spleen', 'spleen'), preset: 'spleenLymph' },
        { match: nameIncludes('Vessel', 'vessel', 'duct', 'Duct', 'trunk', 'Trunk'), preset: 'lymphVessel' },
        { match: () => true, preset: 'lymphNode' },
    ],

    // Body Regions: preset chosen dynamically in resolveAnatomyMaterial()
    regions: [
        { match: () => true, preset: 'skinNoVC' },
    ],

    references: [
        { match: () => true, preset: 'refPlane' },
    ],
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameIncludes(...keywords) {
    const lower = keywords.map(k => k.toLowerCase());
    return (meshName, hierarchyPath) => {
        const combinedLower = (meshName + ' ' + hierarchyPath).toLowerCase();
        return lower.some(kw => combinedLower.includes(kw));
    };
}

function nameEndsWith(...suffixes) {
    return (meshName) => suffixes.some(s => meshName.endsWith(s));
}


// ─── Material factory (each mesh gets own instance for independent highlight) ─

/**
 * Create a NEW material instance for the given preset.
 * No caching — each mesh gets its own so emissive changes don't bleed.
 */
function createMaterial(presetName, hasVertexColors = false) {
    const p = MATERIAL_PRESETS[presetName] || MATERIAL_PRESETS.fallback;

    const matOpts = {
        color: new THREE.Color(p.color),
        roughness: p.roughness,
        metalness: p.metalness,
        side: THREE.DoubleSide,
        flatShading: false,
    };

    if (p.useVertexColors && hasVertexColors) {
        matOpts.vertexColors = true;
    }

    const mat = new THREE.MeshStandardMaterial(matOpts);

    if (p.opacity !== undefined && p.opacity < 1) {
        mat.transparent = true;
        mat.opacity = p.opacity;
        mat.depthWrite = p.depthWrite !== undefined ? p.depthWrite : (p.opacity >= 0.7);
    }

    mat.userData._presetName = presetName;
    return mat;
}


// ─── Public API ───────────────────────────────────────────────────────────────

export function getHierarchyPath(mesh) {
    const parts = [];
    let node = mesh;
    while (node) {
        if (node.name) parts.unshift(node.name);
        node = node.parent;
    }
    return parts.join(' > ');
}

/**
 * Resolve the correct material for a mesh. Each mesh gets its own instance.
 */
export function resolveAnatomyMaterial(systemId, mesh) {
    const rules = SYSTEM_RULES[systemId];
    if (!rules) return createMaterial('fallback');

    const meshName = mesh.name || '';
    const hierarchyPath = getHierarchyPath(mesh);

    // Special handling for Body Regions: pick preset based on vertex colors
    if (systemId === 'regions') {
        const hasVC = !!mesh.geometry?.attributes?.color;
        return createMaterial(hasVC ? 'skinWithVC' : 'skinNoVC', hasVC);
    }

    for (const rule of rules) {
        if (rule.match(meshName, hierarchyPath)) {
            return createMaterial(rule.preset);
        }
    }

    return createMaterial('fallback');
}

/**
 * Check if a mesh is a cross-section helper that should always be hidden.
 */
export function isCrossSectionHelper(meshName) {
    return meshName.startsWith('Cross_Section_') || meshName === 'Take_a_picture';
}

/**
 * Check if a mesh is a degenerate artifact (0 vertices or profile outline).
 */
export function isArtifactMesh(mesh) {
    const name = mesh.name || '';
    if (name.includes('-profile')) return true;
    const pos = mesh.geometry?.attributes?.position;
    if (pos && pos.count === 0) return true;
    return false;
}

/**
 * Check if a mesh is a label-line (very thin, elongated geometry used for arrows).
 * These appear as horizontal lines in the viewport.
 */
export function isLabelLine(mesh) {
    const geo = mesh.geometry;
    if (!geo || !geo.attributes?.position) return false;

    // Only check small meshes (label lines have ~36 verts)
    const verts = geo.attributes.position.count;
    if (verts > 100 || verts === 0) return false;

    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return false;

    const sx = bb.max.x - bb.min.x;
    const sy = bb.max.y - bb.min.y;
    const sz = bb.max.z - bb.min.z;
    const dims = [sx, sy, sz].sort((a, b) => a - b);

    // If thinnest dimension < 0.05 and longest is > 50x thinner — it's a label line
    if (dims[0] < 0.05 && dims[2] > 0 && dims[2] / Math.max(dims[0], 0.0001) > 50) {
        return true;
    }

    return false;
}

export function clearMaterialCache() {
    // No global cache to clear anymore — each mesh has its own material
}
