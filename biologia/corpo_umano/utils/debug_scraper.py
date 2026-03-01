import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        print("[*] Navigating...")
        await page.goto("https://apps.humanatlas.io/kg-explorer/?do=ref-organ", wait_until="networkidle")
        await page.screenshot(path="debug_screenshot.png", full_page=True)
        print("[*] Saved screenshot")
        content = await page.content()
        with open("page_content.html", "w") as f:
            f.write(content)
        await browser.close()

asyncio.run(main())
