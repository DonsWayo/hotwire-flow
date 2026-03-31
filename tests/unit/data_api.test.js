import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import FlowController from "../../src/controllers/flow_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="a" data-node-type="input" style="left:0;top:0;width:150px;height:80px;position:absolute">A</div>
          <div data-flow-node="b" data-node-type="default" style="left:200;top:0;width:150px;height:80px;position:absolute">B</div>
          <div data-flow-node="c" data-node-type="output" style="left:400;top:0;width:150px;height:80px;position:absolute">C</div>
        </div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  return app
}

async function getFlow(app, canvas) {
  return await vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    if (!ctrl || ctrl.getNodes().length === 0) throw new Error("Not ready")
    return ctrl
  }, { timeout: 3000 })
}

describe("Data API: addNode, removeNode", () => {
  let app, canvas, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    canvas = document.getElementById("canvas")
    flow = await getFlow(app, canvas)
  })

  it("getNodes returns all nodes", () => {
    const nodes = flow.getNodes()
    expect(nodes.length).toBe(3)
    expect(nodes.map(n => n.id)).toEqual(["a", "b", "c"])
  })

  it("getNode returns single node", () => {
    const node = flow.getNode("a")
    expect(node).toBeTruthy()
    expect(node.id).toBe("a")
    expect(node.type).toBe("input")
  })

  it("getNode returns null for unknown id", () => {
    expect(flow.getNode("unknown")).toBeNull()
  })

  it("addNode adds to internal map", () => {
    flow.addNode({ id: "d", type: "default", position: { x: 100, y: 100 }, data: { label: "New" } })
    expect(flow.getNode("d")).toBeTruthy()
    expect(flow.getNodes().length).toBe(4)
  })

  it("removeNode removes from internal map and DOM", () => {
    flow.removeNode("a")
    expect(flow.getNode("a")).toBeNull()
    expect(flow.getNodes().length).toBe(2)
    expect(document.querySelector('[data-flow-node="a"]')).toBeNull()
  })

  it("removeNode clears from selection", () => {
    flow.selectNode("a")
    expect(flow.selectedNodes.has("a")).toBe(true)
    flow.removeNode("a")
    expect(flow.selectedNodes.has("a")).toBe(false)
  })
})

describe("Data API: addEdge, removeEdge", () => {
  let app, canvas, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    canvas = document.getElementById("canvas")
    flow = await getFlow(app, canvas)
  })

  it("addEdge adds to internal map", () => {
    flow.addEdge({ id: "e1", source: "a", target: "b" })
    expect(flow.getEdge("e1")).toBeTruthy()
    expect(flow.getEdges().length).toBe(1)
  })

  it("removeEdge removes from internal map", () => {
    flow.addEdge({ id: "e1", source: "a", target: "b" })
    flow.removeEdge("e1")
    expect(flow.getEdge("e1")).toBeNull()
    expect(flow.getEdges().length).toBe(0)
  })

  it("getEdge returns null for unknown id", () => {
    expect(flow.getEdge("unknown")).toBeNull()
  })
})

describe("Data API: getIncomers, getOutgoers, getConnectedEdges", () => {
  let app, canvas, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    canvas = document.getElementById("canvas")
    flow = await getFlow(app, canvas)

    flow.addEdge({ id: "e1", source: "a", target: "b" })
    flow.addEdge({ id: "e2", source: "b", target: "c" })
  })

  it("getIncomers returns source nodes", () => {
    const incomers = flow.getIncomers("b")
    expect(incomers.length).toBe(1)
    expect(incomers[0].id).toBe("a")
  })

  it("getOutgoers returns target nodes", () => {
    const outgoers = flow.getOutgoers("b")
    expect(outgoers.length).toBe(1)
    expect(outgoers[0].id).toBe("c")
  })

  it("getIncomers returns empty for source node", () => {
    expect(flow.getIncomers("a").length).toBe(0)
  })

  it("getConnectedEdges returns all connected edges", () => {
    const edges = flow.getConnectedEdges("b")
    expect(edges.length).toBe(2)
    expect(edges.map(e => e.id).sort()).toEqual(["e1", "e2"])
  })
})

describe("Data API: toObject, fromObject", () => {
  let app, canvas, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    canvas = document.getElementById("canvas")
    flow = await getFlow(app, canvas)
  })

  it("toObject serializes state", () => {
    flow.addEdge({ id: "e1", source: "a", target: "b" })
    flow.setViewport({ x: 100, y: 50, zoom: 1.5 })

    const obj = flow.toObject()
    expect(obj.nodes.length).toBe(3)
    expect(obj.edges.length).toBe(1)
    expect(obj.viewport).toEqual({ x: 100, y: 50, zoom: 1.5 })
  })

  it("fromObject restores viewport", () => {
    flow.fromObject({ viewport: { x: 200, y: 300, zoom: 2 } })
    expect(flow.viewport).toEqual({ x: 200, y: 300, zoom: 2 })
  })

  it("getNodesBounds computes bounds", () => {
    const bounds = flow.getNodesBounds([
      { position: { x: 10, y: 20 }, width: 100, height: 50 },
      { position: { x: 200, y: 100 }, width: 150, height: 80 }
    ])
    expect(bounds.x).toBe(10)
    expect(bounds.y).toBe(20)
    expect(bounds.width).toBe(340) // (200+150) - 10
    expect(bounds.height).toBe(160) // (100+80) - 20
  })
})

describe("Data API: viewport methods", () => {
  let app, canvas, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    canvas = document.getElementById("canvas")
    flow = await getFlow(app, canvas)
  })

  it("getViewport returns copy of viewport", () => {
    const vp = flow.getViewport()
    expect(vp).toEqual({ x: 0, y: 0, zoom: 1 })
    // Mutating copy doesn't affect original
    vp.x = 999
    expect(flow.viewport.x).toBe(0)
  })

  it("setCenter positions viewport correctly", () => {
    flow.setCenter(400, 300, 2)
    // Center should be at middle of canvas
    const rect = canvas.getBoundingClientRect()
    expect(flow.viewport.zoom).toBe(2)
    // x = rect.width/2 - 400*2
    expect(flow.viewport.x).toBe(rect.width / 2 - 800)
  })
})
