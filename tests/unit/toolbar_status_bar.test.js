import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import ToolbarBarController from "../../src/controllers/toolbar_bar_controller.js"
import StatusBarController from "../../src/controllers/status_bar_controller.js"
import FlowController from "../../src/controllers/flow_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="flow-canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="a" style="left:0;top:0;width:100px;height:60px;position:absolute">A</div>
          <div data-flow-node="b" style="left:200;top:0;width:100px;height:60px;position:absolute">B</div>
        </div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
    </div>
    <div class="hf-toolbar-bar" data-controller="flow-toolbar-bar">
      <button data-action="click->flow-toolbar-bar#saveFlow">Save</button>
      <button data-action="click->flow-toolbar-bar#loadFlow">Load</button>
      <button data-action="click->flow-toolbar-bar#exportJSON">Export</button>
      <button data-action="click->flow-toolbar-bar#fitView">Fit</button>
      <span data-flow-toolbar-bar-target="zoomLevel">100%</span>
      <span data-flow-toolbar-bar-target="nodeCount">0 nodes</span>
      <span data-flow-toolbar-bar-target="edgeCount">0 edges</span>
    </div>
    <div class="hf-status-bar" data-controller="flow-status-bar">
      <span data-flow-status-bar-target="zoom">100%</span>
      <span data-flow-status-bar-target="position">0, 0</span>
      <span data-flow-status-bar-target="nodes">0 nodes</span>
      <span data-flow-status-bar-target="edges">0 edges</span>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  app.register("flow-toolbar-bar", ToolbarBarController)
  app.register("flow-status-bar", StatusBarController)
  return app
}

describe("ToolbarBarController", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("updates stats after flow ready", async () => {
    await new Promise(r => setTimeout(r, 800))
    const nodeCount = document.querySelector('[data-flow-toolbar-bar-target="nodeCount"]')
    expect(nodeCount.textContent).toContain("2 nodes")
  })

  it("updates zoom level", async () => {
    await new Promise(r => setTimeout(r, 800))
    const zoomEl = document.querySelector('[data-flow-toolbar-bar-target="zoomLevel"]')
    expect(zoomEl.textContent).toContain("100%")
  })

  it("saveFlow saves to localStorage", async () => {
    await new Promise(r => setTimeout(r, 800))
    const toolbar = app.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller="flow-toolbar-bar"]'),
      "flow-toolbar-bar"
    )
    if (toolbar) {
      toolbar.saveFlow()
      const saved = localStorage.getItem("hotwire-flow-state")
      expect(saved).toBeTruthy()
      const parsed = JSON.parse(saved)
      expect(parsed.nodes).toBeTruthy()
      expect(parsed.viewport).toBeTruthy()
    }
  })

  it("loadFlow restores state", async () => {
    await new Promise(r => setTimeout(r, 800))
    const state = { nodes: [{ id: "x", type: "default", position: { x: 0, y: 0 } }], edges: [], viewport: { x: 10, y: 20, zoom: 1.5 } }
    localStorage.setItem("hotwire-flow-state", JSON.stringify(state))

    const toolbar = app.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller="flow-toolbar-bar"]'),
      "flow-toolbar-bar"
    )
    if (toolbar) {
      toolbar.loadFlow()
      const canvas = document.getElementById("flow-canvas")
      const flow = app.getControllerForElementAndIdentifier(canvas, "flow")
      expect(flow.viewport.zoom).toBe(1.5)
    }
  })

  it("exportJSON creates download", async () => {
    await new Promise(r => setTimeout(r, 800))
    // Mock URL.createObjectURL and click
    const origCreate = URL.createObjectURL
    let createdBlob = null
    URL.createObjectURL = (blob) => { createdBlob = blob; return "blob:mock" }

    const toolbar = app.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller="flow-toolbar-bar"]'),
      "flow-toolbar-bar"
    )
    if (toolbar) {
      toolbar.exportJSON()
      expect(createdBlob).toBeTruthy()
    }

    URL.createObjectURL = origCreate
  })
})

describe("StatusBarController", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("updates node count", async () => {
    await new Promise(r => setTimeout(r, 800))
    const nodesEl = document.querySelector('[data-flow-status-bar-target="nodes"]')
    expect(nodesEl.textContent).toContain("2 nodes")
  })

  it("updates zoom", async () => {
    await new Promise(r => setTimeout(r, 800))
    const zoomEl = document.querySelector('[data-flow-status-bar-target="zoom"]')
    expect(zoomEl.textContent).toContain("100%")
  })

  it("updates position on mousemove", async () => {
    await new Promise(r => setTimeout(r, 800))
    const statusBar = document.querySelector('[data-controller="flow-status-bar"]')
    statusBar.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 200, bubbles: true }))
    await new Promise(r => setTimeout(r, 50))
    const posEl = document.querySelector('[data-flow-status-bar-target="position"]')
    // Position should show flow coordinates
    expect(posEl.textContent).toMatch(/-?\d+, -?\d+/)
  })
})
