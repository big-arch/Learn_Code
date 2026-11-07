import { chromium } from 'playwright'
import legacyChecks from './browser-checks.mjs'
import studioChecks from './studio-checks.mjs'
import adventureChecks from './adventure-checks.mjs'
import bookStudioChecks from './book-studio-checks.mjs'
import videoChecks from './video-checks.mjs'
const browser = await chromium.launch()
try {
  for (const run of [legacyChecks, studioChecks, adventureChecks, bookStudioChecks, videoChecks]) {
    const context = await browser.newContext()
    try { console.log(JSON.stringify(await run(await context.newPage()), null, 2)) }
    finally { await context.close() }
  }
} finally { await browser.close() }
