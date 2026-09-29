// EXPERIMENT ONLY (experiment/click-hang-repro, DO NOT MERGE).
// Same projects as playwright.config.ts. CLICK_HANG_BROWSER=bundled drops the Chrome channel so
// Playwright's bundled Chromium runs instead. A 38 s action timeout makes a hung click fail with
// Playwright's own call log (what it was waiting for) before the 45 s test timeout closes the page.
import {defineConfig} from '@playwright/test';
import base from './playwright.config';
const bundled=process.env.CLICK_HANG_BROWSER==='bundled';
export default defineConfig({
 ...base,
 use:{...base.use,actionTimeout:38000},
 projects:(base.projects??[]).map(project=>{const use={...project.use};if(bundled)delete use.channel;return {...project,use};}),
});
