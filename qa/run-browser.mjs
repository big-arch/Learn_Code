import { chromium } from 'playwright'
import runChecks from './browser-checks.mjs'
const browser = await chromium.launch()
try {
  const context = await browser.newContext()
  const page = await context.newPage()
  console.log(JSON.stringify(await runChecks(page), null, 2))
} finally { await browser.close() }
