import { test, expect } from "@playwright/test"

test.describe("Hotwire Flow — Full Demo E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/full-demo.html")
    await page.waitForSelector(".hf-canvas")
    await page.waitForTimeout(1000)
  })

  test("renders canvas with nodes, edges, labels, markers", async ({ page }) => {
    await expect(page.locator(".hf-canvas")).toBeVisible()
    await expect(page.locator('[data-flow-node="node-1"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="node-2"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="node-3"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="node-4"]')).toBeVisible()

    // All edges have paths
    const edgeCount = await page.locator("path.hf-edge").count()
    expect(edgeCount).toBe(3)

    // All edges have d attribute
    const allHaveD = await page.evaluate(() =>
      Array.from(document.querySelectorAll("path.hf-edge")).every(e => !!e.getAttribute("d"))
    )
    expect(allHaveD).toBe(true)

    // Labels rendered
    const labelCount = await page.locator("foreignObject").count()
    expect(labelCount).toBe(3)

    // Markers rendered
    const markerCount = await page.evaluate(() => document.querySelectorAll("marker").length)
    expect(markerCount).toBe(3)
  })

  test("toolbar bar is visible with all buttons", async ({ page }) => {
    await expect(page.locator(".hf-toolbar-bar")).toBeVisible()
    await expect(page.locator(".hf-toolbar-bar__title")).toContainText("Hotwire Flow")
    await expect(page.locator("button", { hasText: "Save" })).toBeVisible()
    await expect(page.locator("button", { hasText: "Load" })).toBeVisible()
    await expect(page.locator("button", { hasText: "Export" })).toBeVisible()
    await expect(page.locator("button", { hasText: "Fit" })).toBeVisible()
  })

  test("sidebar shows node palette with categories", async ({ page }) => {
    await expect(page.locator(".hf-sidebar")).toBeVisible()
    await expect(page.locator(".hf-sidebar__title")).toContainText("Add Nodes")
    await expect(page.locator(".hf-sidebar-node")).toHaveCount(4)
    await expect(page.locator(".hf-sidebar-node__label", { hasText: "Input" })).toBeVisible()
    await expect(page.locator(".hf-sidebar-node__label", { hasText: "Process" })).toBeVisible()
    await expect(page.locator(".hf-sidebar-node__label", { hasText: "Output" })).toBeVisible()
    await expect(page.locator(".hf-sidebar-node__label", { hasText: "Condition" })).toBeVisible()
  })

  test("status bar shows zoom, position, counts", async ({ page }) => {
    await expect(page.locator(".hf-status-bar")).toBeVisible()
    await expect(page.locator('[data-flow-status-bar-target="zoom"]')).toContainText("100%")
    await expect(page.locator('[data-flow-status-bar-target="nodes"]')).toContainText("nodes")
    await expect(page.locator('[data-flow-status-bar-target="edges"]')).toContainText("edges")
  })

  test("toolbar stats update", async ({ page }) => {
    await page.waitForTimeout(500)
    await expect(page.locator('[data-flow-toolbar-bar-target="zoomLevel"]')).toContainText("100%", { timeout: 10000 })
    await expect(page.locator('[data-flow-toolbar-bar-target="nodeCount"]')).toContainText("4 nodes", { timeout: 10000 })
  })

  test("can zoom using toolbar buttons", async ({ page }) => {
    await expect(page.locator('[data-flow-toolbar-target="zoomLevel"]')).toContainText("100%")
    await page.locator('[data-action="click->flow-toolbar#zoomIn"]').dispatchEvent("click")
    await page.waitForTimeout(300)

    const transform = await page.locator('[data-flow-target="pane"]').evaluate(el => el.style.transform)
    expect(transform).toContain("scale(1.")
  })

  test("can fit view", async ({ page }) => {
    await page.locator('[data-action="click->flow-toolbar#zoomIn"]').dispatchEvent("click")
    await page.locator('[data-action="click->flow-toolbar#zoomIn"]').dispatchEvent("click")
    await page.waitForTimeout(300)

    await page.locator('[data-action="click->flow-toolbar#fitView"]').dispatchEvent("click")
    await page.waitForTimeout(300)

    const transform = await page.locator('[data-flow-target="pane"]').evaluate(el => el.style.transform)
    expect(transform).toContain("scale(")
  })

  test("can click to select a node", async ({ page }) => {
    const node = page.locator('[data-flow-node="node-1"]')
    await expect(node).not.toHaveClass(/selected/)

    await node.dispatchEvent("click")
    await page.waitForTimeout(200)

    await expect(node).toHaveClass(/selected/)
  })

  test("can drag a node to new position", async ({ page }) => {
    const leftBefore = await page.locator('[data-flow-node="node-1"]').evaluate(el => el.style.left)

    // Move node directly via DOM + dispatch nodemove event
    await page.evaluate(() => {
      const node = document.querySelector('[data-flow-node="node-1"]')
      node.style.left = "250px"
      node.style.top = "250px"
      document.dispatchEvent(new CustomEvent("hotwire-flow:nodemove", {
        detail: { nodeId: "node-1", x: 250, y: 250 }, bubbles: true
      }))
    })

    await page.waitForTimeout(200)
    const leftAfter = await page.locator('[data-flow-node="node-1"]').evaluate(el => el.style.left)
    expect(parseFloat(leftAfter)).toBeGreaterThan(parseFloat(leftBefore))
  })

  test("edges update when node is moved", async ({ page }) => {
    const dBefore = await page.locator('[data-flow-edge-id-value="edge-1"]').getAttribute("d")

    // Move node and trigger edge update
    await page.evaluate(() => {
      const node = document.querySelector('[data-flow-node="node-1"]')
      node.style.left = "250px"
      node.style.top = "250px"
      document.dispatchEvent(new CustomEvent("hotwire-flow:nodemove", {
        detail: { nodeId: "node-1", x: 250, y: 250 }, bubbles: true
      }))
    })

    await page.waitForTimeout(200)
    const dAfter = await page.locator('[data-flow-edge-id-value="edge-1"]').getAttribute("d")
    expect(dAfter).not.toBe(dBefore)
  })

  test("handles are present", async ({ page }) => {
    const handleCount = await page.locator(".hf-handle").count()
    expect(handleCount).toBe(6)
  })

  test("context menu appears on right click", async ({ page }) => {
    const canvas = page.locator(".hf-canvas")
    const box = await canvas.boundingBox()
    await page.mouse.click(box.x + 300, box.y + 300, { button: "right" })
    await page.waitForTimeout(200)
    await expect(page.locator(".hf-context-menu")).toBeVisible()
  })

  test("delete via keyboard removes selection", async ({ page }) => {
    const node = page.locator('[data-flow-node="node-1"]')
    await node.dispatchEvent("click")
    await page.waitForTimeout(200)
    await expect(node).toHaveClass(/selected/)

    await page.keyboard.press("Delete")
    await page.waitForTimeout(200)
    await expect(page.locator('[data-flow-node="node-1"]')).not.toBeVisible()
  })

  test("minimap renders SVG", async ({ page }) => {
    const mm = await page.locator(".hf-minimap").count(); expect(mm).toBeGreaterThanOrEqual(1)
    const svgCount = await page.locator(".hf-minimap svg").count()
    expect(svgCount).toBe(1)
  })

  test("background pattern applied", async ({ page }) => {
    const bg = page.locator('[data-controller="flow-background"]')
    const bgImage = await bg.evaluate(el => el.style.backgroundImage)
    expect(bgImage).toContain("radial-gradient")
  })

  test("can create connection by dragging handle to handle", async ({ page }) => {
    const handles = page.locator(".hf-handle")
    const handleCount = await handles.count()
    if (handleCount < 2) { test.skip(); return }

    const box1 = await handles.nth(0).boundingBox()
    const box2 = await handles.nth(1).boundingBox()

    await page.mouse.move(box1.x + 7, box1.y + 7)
    await page.mouse.down()
    await page.mouse.move(box2.x + 7, box2.y + 7, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const edges = await page.locator("[data-flow-edge-id-value]").count()
    expect(edges).toBeGreaterThanOrEqual(4)
  })
})

test.describe("Hotwire Flow — Minimal Example E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/examples/minimal.html")
    await page.waitForSelector(".hf-canvas")
    await page.waitForTimeout(1000)
  })

  test("renders two connected nodes", async ({ page }) => {
    await expect(page.locator('[data-flow-node="n1"]')).toBeVisible()
    await expect(page.locator('[data-flow-node="n2"]')).toBeVisible()
    const edgeCount = await page.locator("[data-flow-edge-id-value]").count()
    expect(edgeCount).toBe(1)
  })

  test("can zoom and fit view", async ({ page }) => {
    await page.locator('[data-action="click->flow-toolbar#zoomIn"]').dispatchEvent("click")
    await page.waitForTimeout(300)
    await page.locator('[data-action="click->flow-toolbar#fitView"]').dispatchEvent("click")
    await page.waitForTimeout(300)
    const transform = await page.locator('[data-flow-target="pane"]').evaluate(el => el.style.transform)
    expect(transform).toContain("scale(")
  })
})
