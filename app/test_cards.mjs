import { chromium } from '/tmp/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true, isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
});
const page = await context.newPage();

await page.goto('http://localhost:5174');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForLoadState('networkidle');

await page.locator('text=Inizia stima rapida').first().tap();
await page.waitForTimeout(1200);

console.log('=== VERIFICA FINALE - tutte le card devono essere ✓ ===');
const btns = await page.locator('button[type="button"]').all();

let passed = 0, failed = 0;
for (let i = 0; i < btns.length; i++) {
  const box = await btns[i].boundingBox();
  if (!box || box.y + box.height < 0 || box.y > 844) {
    const text = (await btns[i].textContent())?.trim().slice(0,18);
    console.log(`Card[${i}] "${text}" → fuori viewport (y=${box?.y.toFixed(0)})`);
    continue;
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  
  const result = await page.evaluate(({x, y}) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { ok: false, reason: 'null' };
    const btn = el.closest('button');
    return btn ? { ok: true } : { ok: false, elTag: el.tagName, elCls: el.className?.toString().slice(0,50), elText: el.textContent?.trim().slice(0,25) };
  }, {x: cx, y: cy});
  
  const text = (await btns[i].textContent())?.trim().slice(0,18);
  if (result.ok) {
    console.log(`Card[${i}] "${text}" → ✓`);
    passed++;
  } else {
    console.log(`Card[${i}] "${text}" → ✗ coperto da ${result.elTag} "${result.elText}"`);
    failed++;
  }
}
console.log(`\nRisultato: ${passed} OK, ${failed} bloccate`);

await page.screenshot({ path: '/tmp/final_verified.png' });
await browser.close();
