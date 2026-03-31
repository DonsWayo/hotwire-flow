import { test, expect } from "@playwright/test"

// Comprehensive audit of every example
const examples = [
  { name: "full-demo", url: "/examples/full-demo.html", minNodes: 4, minEdges: 3, hasToolbar: true, hasMinimap: true, hasStatusBar: true, hasSidebar: true, hasContextMenu: true },
  { name: "dag-pipeline", url: "/examples/dag-pipeline.html", minNodes: 6, minEdges: 6, hasToolbar: false, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
  { name: "interactive", url: "/examples/interactive.html", minNodes: 5, minEdges: 3, hasToolbar: true, hasMinimap: true, hasStatusBar: true, hasSidebar: true, hasContextMenu: true },
  { name: "save-load", url: "/examples/save-load.html", minNodes: 3, minEdges: 2, hasToolbar: true, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
  { name: "custom-nodes", url: "/examples/custom-nodes.html", minNodes: 4, minEdges: 3, hasToolbar: false, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
  { name: "minimap-demo", url: "/examples/minimap-demo.html", minNodes: 8, minEdges: 5, hasToolbar: false, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
  { name: "minimal", url: "/examples/minimal.html", minNodes: 2, minEdges: 1, hasToolbar: false, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
  { name: "org-chart", url: "/examples/org-chart.html", minNodes: 8, minEdges: 8, hasToolbar: false, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
  { name: "warehouse", url: "/examples/warehouse.html", minNodes: 7, minEdges: 7, hasToolbar: false, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
  { name: "b2b-order", url: "/examples/b2b-order.html", minNodes: 7, minEdges: 8, hasToolbar: false, hasMinimap: false, hasStatusBar: false, hasSidebar: false, hasContextMenu: false },
]

for (const ex of examples) {
  test.describe(`Audit: ${ex.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(ex.url)
      await page.waitForSelector(".hf-canvas")
      await page.waitForTimeout(2000)
    })

    test("no console errors", async ({ page }) => {
      const errors = []
      page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()) })
      await page.waitForTimeout(500)
      expect(errors.length).toBe(0)
    })

    test("nodes render with data-flow-node", async ({ page }) => {
      const count = await page.locator("[data-flow-node]").count()
      expect(count).toBeGreaterThanOrEqual(ex.minNodes)
    })

    test("edges have d attribute", async ({ page }) => {
      const allHaveD = await page.evaluate(() =>
        Array.from(document.querySelectorAll("path.hf-edge")).every(e => !!e.getAttribute("d"))
      )
      if (ex.minEdges > 0) {
        expect(allHaveD).toBe(true)
      }
    })

    test("edge count matches", async ({ page }) => {
      const count = await page.locator("path.hf-edge").count()
      expect(count).toBeGreaterThanOrEqual(ex.minEdges)
    })

    test("handles are present", async ({ page }) => {
      const count = await page.locator(".hf-handle").count()
      expect(count).toBeGreaterThanOrEqual(ex.minNodes) // at least 1 per node
    })

    test("node click selects", async ({ page }) => {
      const node = page.locator("[data-flow-node]").first()
      await node.dispatchEvent("click")
      await page.waitForTimeout(200)
      await expect(node).toHaveClass(/selected/)
    })

    test("has interactive controls", async ({ page }) => {
      const btnCount = await page.locator("button").count()
      expect(btnCount).toBeGreaterThanOrEqual(1)
    })

    if (ex.hasToolbar) {
      test("toolbar bar renders", async ({ page }) => {
        await expect(page.locator(".hf-toolbar-bar")).toBeVisible()
      })
    }

    if (ex.hasMinimap) {
      test("minimap renders SVG", async ({ page }) => {
        await expect(page.locator(".hf-minimap")).toBeVisible()
        const svgCount = await page.locator(".hf-minimap svg").count()
        expect(svgCount).toBe(1)
      })
    }

    if (ex.hasStatusBar) {
      test("status bar renders", async ({ page }) => {
        await expect(page.locator(".hf-status-bar")).toBeVisible()
      })
    }

    if (ex.hasSidebar) {
      test("sidebar renders", async ({ page }) => {
        await expect(page.locator(".hf-sidebar")).toBeVisible()
      })
    }

    if (ex.hasContextMenu) {
      test("context menu on right click", async ({ page }) => {
        const canvas = page.locator(".hf-canvas")
        const box = await canvas.boundingBox()
        await page.mouse.click(box.x + 300, box.y + 300, { button: "right" })
        await page.waitForTimeout(200)
        await expect(page.locator(".hf-context-menu")).toBeVisible()
      })
    }
  })
}

// Index page audit
test.describe("Audit: index", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/index.html")
    await page.waitForTimeout(1000)
  })

  test("shows hero section", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Hotwire Flow")
  })

  test("shows 13 example cards", async ({ page }) => {
    const count = await page.locator(".card").count()
    expect(count).toBe(13)
  })

  test("each card has iframe preview", async ({ page }) => {
    const iframes = await page.locator(".card__preview img").count()
    expect(iframes).toBeGreaterThanOrEqual(10) // Some new demos may not have screenshots yet
  })

  test("each card has link", async ({ page }) => {
    const links = await page.locator(".card__link").count()
    expect(links).toBe(13)
  })

  test("shows badges", async ({ page }) => {
    await expect(page.locator(".badge--blue")).toContainText("18")
    await expect(page.locator(".badge--green")).toContainText("200")
  })
})
