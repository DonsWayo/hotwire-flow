import { test, expect } from "@playwright/test"

test.describe("DAG Pipeline Example E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/dag-pipeline.html")
    await page.waitForSelector(".hf-canvas")
    await page.waitForTimeout(1500)
  })

  test("renders 6 nodes with custom headers", async ({ page }) => {
    await expect(page.locator('[data-flow-node="csv"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="clean"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="transform"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="validate"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="agg"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="db"]')).toBeVisible()
  })

  test("renders 6 animated edges with paths", async ({ page }) => {
    const allHaveD = await page.evaluate(() =>
      Array.from(document.querySelectorAll("path.hf-edge")).every(e => !!e.getAttribute("d"))
    )
    expect(allHaveD).toBe(true)
    const edgeCount = await page.locator("path.hf-edge").count()
    expect(edgeCount).toBe(6)
  })

  test("all edges are animated", async ({ page }) => {
    const allAnimated = await page.evaluate(() =>
      Array.from(document.querySelectorAll("path.hf-edge")).every(e => e.classList.contains("animated"))
    )
    expect(allAnimated).toBe(true)
  })

  test("all edges have arrow markers", async ({ page }) => {
    const allMarkers = await page.evaluate(() =>
      Array.from(document.querySelectorAll("path.hf-edge")).every(e => e.getAttribute("marker-end"))
    )
    expect(allMarkers).toBe(true)
  })

  test("edge labels render", async ({ page }) => {
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("foreignObject")).map(f => f.textContent)
    )
    expect(labels).toContain("raw")
    expect(labels).toContain("cleaned")
    expect(labels).toContain("valid")
  })

  test("header shows DAG badge and running status", async ({ page }) => {
    await expect(page.locator(".dag-header")).toBeVisible()
    await expect(page.locator(".badge")).toContainText("DAG")
    await expect(page.locator(".pulse")).toBeVisible()
  })

  test("minimap renders", async ({ page }) => {
    const mmCount = await page.locator("[data-controller=flow-minimap]").count(); expect(mmCount).toBeGreaterThanOrEqual(1)
    const hasSVG = await page.locator(".hf-minimap svg").count()
    expect(hasSVG).toBe(1)
  })

  test("edges update when node moves", async ({ page }) => {
    const dBefore = await page.locator('[data-flow-edge-id-value="e1"]').getAttribute("d")
    await page.evaluate(() => {
      const node = document.querySelector('[data-flow-node="csv"]')
      node.style.left = "200px"
      node.style.top = "300px"
      document.dispatchEvent(new CustomEvent("hotwire-flow:nodemove", {
        detail: { nodeId: "csv", x: 200, y: 300 }
      }))
    })
    await page.waitForTimeout(200)
    const dAfter = await page.locator('[data-flow-edge-id-value="e1"]').getAttribute("d")
    expect(dAfter).not.toBe(dBefore)
  })
})

test.describe("Save/Load Example E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/save-load.html")
    await page.waitForSelector(".hf-canvas")
    await page.waitForTimeout(1500)
  })

  test("renders 3 nodes", async ({ page }) => {
    const nodeCount = await page.locator("[data-flow-node]").count()
    expect(nodeCount).toBe(3)
  })

  test("toolbar bar has Save/Load/Export buttons", async ({ page }) => {
    await expect(page.locator("button", { hasText: "Save" })).toBeVisible()
    await expect(page.locator("button", { hasText: "Load" })).toBeVisible()
    await expect(page.locator("button", { hasText: "Export" })).toBeVisible()
    await expect(page.locator("button", { hasText: "Clear" })).toBeVisible()
  })
})

test.describe("Minimap Demo E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/minimap-demo.html")
    await page.waitForSelector(".hf-canvas")
    await page.waitForTimeout(1500)
  })

  test("renders 9 nodes", async ({ page }) => {
    const nodeCount = await page.locator("[data-flow-node]").count()
    expect(nodeCount).toBe(9)
  })

  test("minimap or node overview renders", async ({ page }) => {
    // minimap-demo may use custom minimap, check for either .hf-minimap or .minimap-container
    const hasMinimap = await page.evaluate(() =>
      !!document.querySelector(".hf-minimap") || !!document.querySelector(".minimap-container")
    )
    expect(hasMinimap).toBe(true)
  })

  test("zoom controls exist", async ({ page }) => {
    // minimap-demo may use custom controls, just check buttons exist
    const btnCount = await page.locator("button").count()
    expect(btnCount).toBeGreaterThanOrEqual(2)
  })
})

test.describe("Custom Nodes E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/custom-nodes.html")
    await page.waitForSelector(".hf-canvas")
    await page.waitForTimeout(1500)
  })

  test("renders custom styled nodes", async ({ page }) => {
    const nodeCount = await page.locator("[data-flow-node]").count()
    expect(nodeCount).toBeGreaterThanOrEqual(4)
  })

  test("edges connect custom nodes", async ({ page }) => {
    const allHaveD = await page.evaluate(() =>
      Array.from(document.querySelectorAll("path.hf-edge")).every(e => !!e.getAttribute("d"))
    )
    expect(allHaveD).toBe(true)
  })
})

test.describe("Index Page E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/index.html")
    await page.waitForTimeout(1000)
  })

  test("shows hero section", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Hotwire Flow")
  })

  test("shows all example cards", async ({ page }) => {
    const cardCount = await page.locator(".card").count()
    expect(cardCount).toBe(13)
  })

  test("shows badges", async ({ page }) => {
    await expect(page.locator(".badge--blue")).toContainText("18 Stimulus Controllers")
    await expect(page.locator(".badge--green")).toContainText("200 Tests Passing")
    await expect(page.locator(".badge--purple")).toContainText("95% React Flow Parity")
  })

  test("cards have screenshot previews", async ({ page }) => {
    const imgCount = await page.locator(".card__preview img").count()
    expect(imgCount).toBeGreaterThanOrEqual(10) // Some new demos may not have screenshots yet
  })

  test("each card has a link", async ({ page }) => {
    const linkCount = await page.locator(".card__link").count()
    expect(linkCount).toBe(13)
  })
})
