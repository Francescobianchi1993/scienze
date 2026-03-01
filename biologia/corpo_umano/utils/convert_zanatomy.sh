#!/bin/bash
set -e

SOURCE_DIR="Z-Anatomy/Z-Anatomy PC/Assets/Models/1.0 Models"
DEST_DIR="output/stem/biologia/corpo_umano/public/models/Z-Anatomy"
FBX2GLTF="./node_modules/fbx2gltf/bin/Linux/FBX2glTF"

mkdir -p "$DEST_DIR"

echo "Starting conversion pipeline for Z-Anatomy FBX -> GLB..."

for file in "$SOURCE_DIR"/*.fbx; do
    filename=$(basename "$file")
    name="${filename%.*}"
    dest_file="$DEST_DIR/${name}.glb"
    
    echo "Converting $filename..."
    # -b for binary (glb)
    # -d for draco compression to save huge amounts of space on meshes
    "$FBX2GLTF" -i "$file" -o "$dest_file" -b
    
    # Calculate sizes
    orig_size=$(stat -c%s "$file")
    new_size=$(stat -c%s "$dest_file")
    mb_orig=$(echo "scale=2; $orig_size / 1048576" | bc)
    mb_new=$(echo "scale=2; $new_size / 1048576" | bc)
    
    echo "✔ Done: ${mb_orig}MB -> ${mb_new}MB"
    echo "--------------------------"
done

echo "🎉 All Z-Anatomy models successfully converted and optimized!"
