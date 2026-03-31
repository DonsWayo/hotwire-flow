import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import FlowController from "../../src/controllers/flow_controller.js"
import EdgeController from "../../src/controllers/edge_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <svg data-flow-target="edges" class="hf-edges" width="10000" height="10000"></svg>
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="node-1" data-node-type="input"
               style="left:100px;top:200px;width:150px;height:80px;position:absolute"
               class="hf-node">
            Node 1
            <div data-controller="flow-handle"
                 data-flow-handle-id-value="h1-r"
                 data-flow-handle-node-id-value="node-1"
                 data-flow-handle-position-value="right"
                 data-handle="h1-r"
                 class="hf-handle"></div>
          </div>
          <div data-flow-node="node-2" data-node-type="output"
               style="left:400px;top:200px;width:150px;height:80px;position:absolute"
               class="hf-node">
            Node 2
            <div data-controller="flow-handle"
                 data-flow-handle-id-value="h2-l"
                 data-flow-handle-node-id-value="node-2"
                 data-flow-handle-position-value="left"
                 data-handle="h2-l"
                 class="hf-handle"></div>
          </div>
          <div data-flow-node="node-3" data-node-type="default"
               style="left:250px;top:400px;width:150px;height:80px;position:absolute"
               class="hf-node">
            Node 3
            <div data-controller="flow-handle"
                 data-flow-handle-id-value="h3-r"
                 data-flow-handle-node-id-value="node-3"
                 data-flow-handle-position-value="right"
                 data-handle="h3-r"
                 class="hf-handle"></div>
          </div>
        </div>
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1">
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e1"
                data-flow-edge-source-value="node-1"
                data-flow-edge-source-handle-value="h1-r"
                data-flow-edge-target-value="node-2"
                data-flow-edge-target-handle-value="h2-l"
                data-flow-edge-reconnectable-value="true"
                class="hf-edge" />
        </svg>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  app.register("flow-edge", EdgeController)
  return app
}

async function getFlow(app) {
  const canvas = document.getElementById("canvas")
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  }, { timeout: 3000 })
}

describe("Edge Reconnect", () => {
  let app, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    flow = await getFlow(app)
    // Add edge to internal map
    flow.addEdge({ id: "e1", source: "node-1", target: "node-2", sourceHandle: "h1-r", targetHandle: "h2-l" })
  })

  it("creates reconnect handles when reconnectable is true", async () => {
    const edgeEl = document.querySelector('[data-edge="e1"]')
    const svg = edgeEl.closest("svg")
    const sourceHandle = svg.querySelector('[data-edge-reconnect-source="e1"]')
    const targetHandle = svg.querySelector('[data-edge-reconnect-target="e1"]')
    expect(sourceHandle).toBeTruthy()
    expect(targetHandle).toBeTruthy()
  })

  it("reconnect handles are invisible circles", async () => {
    const edgeEl = document.querySelector('[data-edge="e1"]')
    const svg = edgeEl.closest("svg")
    const sourceHandle = svg.querySelector('[data-edge-reconnect-source="e1"]')
    expect(sourceHandle.getAttribute("fill")).toBe("transparent")
    expect(sourceHandle.getAttribute("r")).toBe("8")
  })

  it("dispatches reconnectstart when source handle is dragged", async () => {
    const handler = vi.fn()
    document.addEventListener("hotwire-flow:reconnectstart", handler)
    
    const edgeEl = document.querySelector('[data-edge="e1"]')
    const svg = edgeEl.closest("svg")
    const sourceHandle = svg.querySelector('[data-edge-reconnect-source="e1"]')
    
    sourceHandle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    
    expect(handler).toHaveBeenCalled()
    const detail = handler.mock.calls[0][0].detail
    expect(detail.edgeId).toBe("e1")
    expect(detail.type).toBe("source")
    expect(detail.currentNode).toBe("node-1")
    expect(detail.currentHandle).toBe("h1-r")
    
    document.removeEventListener("hotwire-flow:reconnectstart", handler)
  })

  it("dispatches reconnectstart when target handle is dragged", async () => {
    const handler = vi.fn()
    document.addEventListener("hotwire-flow:reconnectstart", handler)
    
    const edgeEl = document.querySelector('[data-edge="e1"]')
    const svg = edgeEl.closest("svg")
    const targetHandle = svg.querySelector('[data-edge-reconnect-target="e1"]')
    
    targetHandle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    
    expect(handler).toHaveBeenCalled()
    const detail = handler.mock.calls[0][0].detail
    expect(detail.edgeId).toBe("e1")
    expect(detail.type).toBe("target")
    expect(detail.currentNode).toBe("node-2")
    expect(detail.currentHandle).toBe("h2-l")
    
    document.removeEventListener("hotwire-flow:reconnectstart", handler)
  })

  it("flow controller starts connecting on reconnectstart", async () => {
    const edgeEl = document.querySelector('[data-edge="e1"]')
    const svg = edgeEl.closest("svg")
    const sourceHandle = svg.querySelector('[data-edge-reconnect-source="e1"]')
    
    sourceHandle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    
    expect(flow.isConnecting).toBe(true)
    expect(flow.connectingFrom.nodeId).toBe("node-1")
    expect(flow.connectingFrom.handleId).toBe("h1-r")
  })

  it("does not create reconnect handles when reconnectable is false", async () => {
    // Create new edge with reconnectable=false
    document.body.innerHTML = `
      <div data-controller="flow" id="canvas2" class="hf-canvas" data-flow-fit-view-on-init-value="false">
        <div data-flow-target="pane" class="hf-pane">
          <svg data-flow-target="edges" class="hf-edges" width="10000" height="10000"></svg>
          <div data-flow-target="nodes" class="hf-nodes">
            <div data-flow-node="n1" style="left:100px;top:100px;width:150px;height:80px;position:absolute">N1</div>
            <div data-flow-node="n2" style="left:400px;top:100px;width:150px;height:80px;position:absolute">N2</div>
          </div>
          <svg style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1">
            <path data-controller="flow-edge"
                  data-flow-edge-id-value="e2"
                  data-flow-edge-source-value="n1"
                  data-flow-edge-target-value="n2"
                  data-flow-edge-reconnectable-value="false"
                  class="hf-edge" />
          </svg>
        </div>
        <div data-flow-target="selectionBox" class="hf-selection-box"></div>
      </div>
    `
    const app2 = Application.start()
    app2.register("flow", FlowController)
    app2.register("flow-edge", EdgeController)
    
    await vi.waitFor(() => {
      const el = document.getElementById("canvas2")
      const ctrl = app2.getControllerForElementAndIdentifier(el, "flow")
      if (!ctrl) throw new Error("Not ready")
      return ctrl
    })
    
    const edgeEl = document.querySelector('[data-edge="e2"]')
    const svg = edgeEl.closest("svg")
    const sourceHandle = svg.querySelector('[data-edge-reconnect-source="e2"]')
    expect(sourceHandle).toBeFalsy()
  })

  it.skip("cleans up reconnect handles on disconnect", async () => {
    const edgeEl = document.querySelector('[data-edge="e1"]')
    const svg = edgeEl.closest("svg")
    
    // Get controller and disconnect
    const edgeCtrl = app.getControllerForElementAndIdentifier(edgeEl, "flow-edge")
    expect(edgeCtrl).toBeTruthy()
    expect(edgeCtrl._sourceHandle).toBeTruthy() // Ensure handles exist before disconnect
    
    edgeCtrl.disconnect()
    
    // Force DOM update
    await new Promise(r => setTimeout(r, 10))
    
    const sourceHandle = svg.querySelector('[data-edge-reconnect-source="e1"]')
    expect(sourceHandle).toBeFalsy()
  })
})
