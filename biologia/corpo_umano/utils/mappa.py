import os

# Percorsi aggiornati alla tua cartella
repo_path = "/home/gobubble/work/YOUCANMATH/test_antigravity_nano_banana/Z-Anatomy-main"
output_file = "SORGENTE_TOTALE_ZANATOMY.txt"

# Estensioni vitali per la logica e la struttura
code_exts = ('.cs', '.py', '.shader', '.json', '.xml', '.yaml', '.txt', '.md')
# Cartelle da saltare assolutamente (immagini pesanti, file git, cache)
skip_dirs = {'.git', '.github', 'node_modules', '__pycache__', 'Library', 'Temp', 'Logs'}

with open(output_file, 'w', encoding='utf-8') as out:
    out.write("=== DOCUMENTO DI MAPPATURA INTEGRALE Z-ANATOMY ===\n")
    out.write(f"Percorso sorgente: {repo_path}\n\n")

    # 1. CREAZIONE DELL'INDICE (TABLE OF CONTENTS)
    out.write("--- 1. STRUTTURA COMPLETA DEI FILE ---\n")
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        level = root.replace(repo_path, '').count(os.sep)
        indent = ' ' * 4 * level
        out.write(f"{indent}[D] {os.path.basename(root)}/\n")
        for f in files:
            if f.endswith(code_exts):
                out.write(f"{indent}    [F] {f}\n")
    
    out.write("\n\n--- 2. CONTENUTO INTEGRALE DEL CODICE ---\n")

    # 2. ESTRAZIONE INTEGRALE
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for file in files:
            if file.endswith(code_exts):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, repo_path)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        out.write(f"\n\nFILE_START: {rel_path}\n")
                        out.write("=" * 40 + "\n")
                        out.write(content)
                        out.write(f"\nFILE_END: {rel_path}\n")
                        out.write("=" * 40 + "\n")
                except Exception as e:
                    out.write(f"\nERRORE LETTURA FILE {rel_path}: {str(e)}\n")

print(f"✅ Mappatura completata! Il file è pronto qui: {os.path.abspath(output_file)}")
