import { chromium } from 'playwright'
import legacyChecks from './browser-checks.mjs'
import studioChecks from './studio-checks.mjs'
import adventureChecks from './adventure-checks.mjs'
const browser = await chromium.launch()
try {
  for (const run of [legacyChecks, studioChecks, adventureChecks]) {
    const context = await browser.newContext()
    try { console.log(JSON.stringify(await run(await context.newPage()), null, 2)) }
    finally { await context.close() }
  }
} finally { await browser.close() }
