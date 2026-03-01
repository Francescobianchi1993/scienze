import os
import re
import asyncio
from playwright.async_api import async_playwright

# Configurazione
BASE_URL = "https://apps.humanatlas.io/kg-explorer/?do=ref-organ"
DOWNLOAD_DIR = "organ_human_body"

def sanitize_filename(name):
    """Rimuove caratteri speciali e spazi per nomi file puliti."""
    name = name.replace("3D reference organ for ", "")
    return re.sub(r'[^\w\s-]', '', name).strip().replace(" ", "_").lower()

async def download_file(page, row, format_type, organ_name):
    """Gestisce il clic sul menu e il download del formato specifico."""
    try:
        # Clicca sull'icona di download della riga specifica
        download_btn = await row.query_selector('button[hrafeature="download"]')
        if not download_btn: return False
        
        await download_btn.click()
        await page.wait_for_timeout(500) # Attesa comparsa menu

        # Cerca il link specifico (GLB o JSON) nel menu a comparsa
        # Aspettiamo che il menu appaia
        await page.wait_for_selector(".mat-mdc-menu-content, .mat-menu-content", timeout=5000)
        
        # Cerca il testo nel menu (non exact=True perché potrebbe avere la dimensione, es. "GLB (11 MB)")
        link = page.locator(f".mat-mdc-menu-item:has-text('{format_type}')")
        if await link.count() == 0:
            link = page.locator(f".mat-menu-item:has-text('{format_type}')")
            
        if await link.count() == 0:
            print(f"      [!] Formato {format_type} non trovato per {organ_name}")
            # print html of the menu for debugging
            menu_html = await page.locator(".mat-mdc-menu-panel, .mat-menu-panel").inner_html()
            print(f"      [DEBUG] Menu HTML: {menu_html}")
            # Chiudi il menu cliccando altrove (ESC non sempre funziona se il focus è altrove, usiamo click sul body)
            await page.mouse.click(0, 0)
            return False
            
        async with page.expect_download() as download_info:
            await link.first.click()
            
        download = await download_info.value
        extension = ".glb" if format_type == "GLB" else ".json"
        final_path = os.path.join(DOWNLOAD_DIR, f"{organ_name}{extension}")
        
        await download.save_as(final_path)
        print(f"      [✓] Scaricato: {organ_name}{extension}")
        return True
    except Exception as e:
        print(f"      [X] Errore durante il download di {format_type}: {e}")
        return False

async def main():
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True) # Metti True per nascondere il browser
        context = await browser.new_context()
        page = await context.new_page()

        print(f"[*] Navigazione verso: {BASE_URL}")
        await page.goto(BASE_URL, wait_until="networkidle")
        
        # Attendi che la tabella dei modelli sia carica
        await page.wait_for_selector("table[mat-table] tr[mat-row]")
        rows = await page.query_selector_all("table[mat-table] tr[mat-row]")
        
        print(f"[*] Trovati {len(rows)} organi potenziali.")

        for i, row in enumerate(rows):
            # Estrai il nome dell'organo per rinominare i file
            label_element = await row.query_selector("td.mat-column-title")
            raw_label = await label_element.inner_text() if label_element else f"organ_{i}"
            organ_name = sanitize_filename(raw_label)

            print(f"[{i+1}/{len(rows)}] Elaborazione: {organ_name}...")

            # Download della coppia GLB e JSON
            await download_file(page, row, "GLB", organ_name)
            await download_file(page, row, "JSON", organ_name)

        print(f"\n[!] Operazione completata. Tutti i file sono in: {DOWNLOAD_DIR}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())