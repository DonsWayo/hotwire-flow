import { chromium } from "playwright"

const examples = [
  { name: "full-demo", url: "http://localhost:3000/examples/full-demo.html" },
  { name: "dag-pipeline", url: "http://localhost:3000/examples/dag-pipeline.html" },
  { name: "interactive", url: "http://localhost:3000/examples/interactive.html" },
  { name: "save-load", url: "http://localhost:3000/examples/save-load.html" },
  { name: "custom-nodes", url: "http://localhost:3000/examples/custom-nodes.html" },
  { name: "minimap-demo", url: "http://localhost:3000/examples/minimap-demo.html" },
  { name: "minimal", url: "http://localhost:3000/examples/minimal.html" },
  { name: "org-chart", url: "http://localhost:3000/examples/org-chart.html" },
  { name: "warehouse", url: "http://localhost:3000/examples/warehouse.html" },
  { name: "b2b-order", url: "http://localhost:3000/examples/b2b-order.html" },
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })

for (const ex of examples) {
  const page = await context.newPage()
  try {
    await page.goto(ex.url, { waitUntil: "networkidle", timeout: 10000 })
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: `screenshots/${ex.name}.png`,
      type: "png",
    })
    console.log(`✅ ${ex.name}.png`)
  } catch (e) {
    console.log(`❌ ${ex.name}: ${e.message}`)
  }
  await page.close()
}

await browser.close()
console.log("Done!")
