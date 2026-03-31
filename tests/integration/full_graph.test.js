import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import { registerHotwireFlow } from "../../src/index.js"

function setupFullDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-controller="flow-background"
           data-flow-background-flow-outlet="#canvas"
           data-flow-background-variant-value="dots"
           class="absolute inset-0"></div>
      <div data-flow-target="pane" class="hf-pane">
        <svg data-flow-target="edges" class="hf-edges" width="10000" height="10000">
          <path data-controller="flow-edge"
                data-flow-edge-flow-outlet="#canvas"
                data-flow-edge-id-value="e1"
                data-flow-edge-source-value="n1"
                data-flow-edge-source-handle-value="right"
                data-flow-edge-target-value="n2"
                data-flow-edge-target-handle-value="left"
                data-flow-edge-type-value="bezier"
                class="hf-edge" />
          <path data-controller="flow-connection-line"
                data-flow-connection-line-flow-outlet="#canvas"
                class="hf-connection-line"
                style="display:none" />
        </svg>
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-controller="flow-node"
               data-flow-node-flow-outlet="#canvas"
               data-flow-node-id-value="n1"
               data-flow-node-type-value="input"
               data-flow-node-x-value="100"
               data-flow-node-y-value="200"
               class="hf-node hf-node--input"
               data-action="pointerdown->flow-node#pointerDown click->flow-node#click">
            <div class="hf-node__header">Input</div>
            <div class="hf-node__body">Data source</div>
            <div data-controller="flow-handle"
                 data-flow-handle-flow-outlet="#canvas"
                 data-flow-handle-id-value="h1-r"
                 data-flow-handle-node-id-value="n1"
                 data-flow-handle-position-value="right"
                 class="hf-handle hf-handle--right"
                 data-action="pointerdown->flow-handle#pointerDown"></div>
          </div>
          <div data-controller="flow-node"
               data-flow-node-flow-outlet="#canvas"
               data-flow-node-id-value="n2"
               data-flow-node-type-value="output"
               data-flow-node-x-value="500"
               data-flow-node-y-value="200"
               class="hf-node hf-node--output"
               data-action="pointerdown->flow-node#pointerDown click->flow-node#click">
            <div data-controller="flow-handle"
                 data-flow-handle-flow-outlet="#canvas"
                 data-flow-handle-id-value="h2-l"
                 data-flow-handle-node-id-value="n2"
                 data-flow-handle-position-value="left"
                 class="hf-handle hf-handle--left"
                 data-action="pointerdown->flow-handle#pointerDown"></div>
            <div class="hf-node__header">Output</div>
            <div class="hf-node__body">Destination</div>
          </div>
        </div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
      <div class="hf-controls" data-controller="flow-toolbar"
           data-flow-toolbar-flow-outlet="#canvas">
        <button data-action="click->flow-toolbar#zoomIn" class="hf-control-btn">+</button>
        <span data-flow-toolbar-target="zoomLevel">100%</span>
        <button data-action="click->flow-toolbar#zoomOut" class="hf-control-btn">−</button>
        <button data-action="click->flow-toolbar#fitView" class="hf-control-btn">fit</button>
      </div>
      <div data-controller="flow-minimap"
           data-flow-minimap-flow-outlet="#canvas"
           style="width:200px;height:150px"></div>
      <div data-controller="flow-context-menu"
           data-flow-context-menu-flow-outlet="#canvas"
           class="hf-context-menu"
           style="display:none">
        <button data-action="click->flow-context-menu#deleteNode">Delete</button>
        <button data-action="click->flow-context-menu#addNodeHere">Add</button>
      </div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  registerHotwireFlow(app)
  return app
}

async function getController(app, el, id) {
  return await vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, id)
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  }, { timeout: 3000 })
}

describe("Integration: Full flow graph", () => {
  let app, canvas

  beforeEach(() => {
    setupFullDOM()
    app = startApp()
    canvas = document.getElementById("canvas")
  })

  it("initializes all controllers", async () => {
    const flowCtrl = await getController(app, canvas, "flow")
    expect(flowCtrl).toBeTruthy()
  })

  it("full workflow: select node, pan, zoom, fit", async () => {
    const ctrl = await getController(app, canvas, "flow")

    ctrl.selectNode("n1")
    expect(ctrl.selectedNodes.has("n1")).toBe(true)

    ctrl.panBy(100, 50)
    expect(ctrl.viewport.x).toBe(100)

    ctrl.zoomIn()
    expect(ctrl.viewport.zoom).toBeGreaterThan(1)

    ctrl.fitView()
    expect(ctrl.viewport.zoom).toBeGreaterThan(0)

    ctrl.clearSelection()
    expect(ctrl.selectedNodes.size).toBe(0)
  })

  it("node drag updates connected edges", async () => {
    const ctrl = await getController(app, canvas, "flow")

    const edgeEl = document.querySelector('[data-flow-edge-id-value="e1"]')
    // Let edge connect and calculate initial path
    await new Promise(r => setTimeout(r, 100))
    const dBefore = edgeEl.getAttribute("d")

    ctrl._moveNode("n1", 300, 300)
    await new Promise(r => setTimeout(r, 50))

    const dAfter = edgeEl.getAttribute("d")
    expect(dAfter).not.toBe(dBefore)
  })

  it("connection flow: handle drag creates edge event", async () => {
    const ctrl = await getController(app, canvas, "flow")

    const connectHandler = vi.fn()
    canvas.addEventListener("hotwire-flow:connect", connectHandler)

    ctrl.startConnecting("h1-r", "n1", { x: 250, y: 240 })
    expect(ctrl.isConnecting).toBe(true)

    ctrl.endConnecting("h2-l", "n2")
    expect(connectHandler).toHaveBeenCalled()
    expect(connectHandler.mock.calls[0][0].detail).toEqual({
      sourceNode: "n1",
      sourceHandle: "h1-r",
      targetNode: "n2",
      targetHandle: "h2-l"
    })
  })

  it("toolbar zoom controls affect viewport", async () => {
    const flowCtrl = await getController(app, canvas, "flow")
    await getController(app, document.querySelector('[data-controller="flow-toolbar"]'), "flow-toolbar")

    const zoomBefore = flowCtrl.viewport.zoom
    document.querySelector('[data-action*="zoomIn"]').click()
    await new Promise(r => setTimeout(r, 10))
    expect(flowCtrl.viewport.zoom).toBeGreaterThan(zoomBefore)
  })

  it("background tracks viewport changes", async () => {
    const flowCtrl = await getController(app, canvas, "flow")
    flowCtrl.setViewport({ x: 60, y: 40, zoom: 1 })

    const bgEl = document.querySelector('[data-controller="flow-background"]')
    expect(bgEl.style.backgroundPosition).toBeTruthy()
  })

  it("minimap renders after nodes are present", async () => {
    await vi.waitFor(() => {
      const minimap = document.querySelector('[data-controller="flow-minimap"]')
      expect(minimap.innerHTML).toContain("<svg")
      expect(minimap.innerHTML).toContain("<rect")
    })
  })

  it("context menu shows and dispatches events", async () => {
    await getController(app, canvas, "flow")
    const menuEl = document.querySelector('[data-controller="flow-context-menu"]')
    await getController(app, menuEl, "flow-context-menu")

    const handler = vi.fn()
    menuEl.addEventListener("hotwire-flow:delete", handler)

    canvas.dispatchEvent(new CustomEvent("hotwire-flow:contextmenu", {
      detail: { x: 300, y: 200, nodeId: "n1", flowPosition: { x: 200, y: 100 } }
    }))

    expect(menuEl.style.display).toBe("block")

    menuEl.querySelector('[data-action*="deleteNode"]').click()
    expect(handler).toHaveBeenCalled()
  })
})
