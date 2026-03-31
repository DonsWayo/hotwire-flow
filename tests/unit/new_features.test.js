import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import FlowController from "../../src/controllers/flow_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false"
         data-flow-default-edge-options-value='{"type":"bezier","animated":false,"markerEnd":"arrow"}'>
      <div data-flow-target="pane" class="hf-pane">
        <svg data-flow-target="edges" class="hf-edges" width="10000" height="10000"></svg>
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="node-1" data-node-type="input"
               style="left:100px;top:200px;width:150px;height:80px;position:absolute"
               class="hf-node">Node 1</div>
          <div data-flow-node="node-2" data-node-type="output"
               style="left:400px;top:200px;width:150px;height:80px;position:absolute"
               class="hf-node">Node 2</div>
          <div data-flow-node="node-3" data-node-type="default"
               style="left:250px;top:400px;width:150px;height:80px;position:absolute"
               class="hf-node">Node 3</div>
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

async function getFlow(app) {
  const canvas = document.getElementById("canvas")
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  }, { timeout: 3000 })
}

describe("Undo/Redo", () => {
  let app, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    flow = await getFlow(app)
  })

  it("starts with empty undo stack", () => {
    expect(flow.canUndo).toBe(false)
    expect(flow.canRedo).toBe(false)
  })

  it("pushes undo on node deletion", () => {
    flow.selectNode("node-1")
    flow._pushUndo()
    flow._deleteSelected()
    expect(flow.canUndo).toBe(true)
  })

  it("undo restores deleted node", () => {
    flow.selectNode("node-1")
    flow._pushUndo()
    flow._deleteSelected()
    expect(flow.getNode("node-1")).toBeNull()

    flow.undo()
    expect(flow.getNode("node-1")).toBeTruthy()
    expect(flow.getNode("node-1").position.x).toBe(100)
  })

  it("redo restores deleted node after undo", () => {
    flow.selectNode("node-1")
    flow._pushUndo()
    flow._deleteSelected()
    expect(flow.getNode("node-1")).toBeNull()

    flow.undo()
    expect(flow.getNode("node-1")).toBeTruthy()

    flow.redo()
    expect(flow.getNode("node-1")).toBeNull()
  })

  it("new action clears redo stack", () => {
    flow.selectNode("node-1")
    flow._pushUndo()
    flow._deleteSelected()

    flow.undo()
    expect(flow.canRedo).toBe(true)

    flow.selectNode("node-2")
    flow._pushUndo()
    flow._deleteSelected()
    expect(flow.canRedo).toBe(false)
  })

  it("undo on empty stack does nothing", () => {
    flow.undo() // should not throw
    expect(flow.canUndo).toBe(false)
  })

  it("redo on empty stack does nothing", () => {
    flow.redo() // should not throw
    expect(flow.canRedo).toBe(false)
  })

  it("undo restores node position after drag", () => {
    const startPositions = flow._snapshot()
    flow._undoStack.push(startPositions)

    // Simulate position change
    const el = document.querySelector('[data-flow-node="node-1"]')
    el.style.left = "200px"
    el.style.top = "300px"
    flow._nodes.set("node-1", { ...flow._nodes.get("node-1"), position: { x: 200, y: 300 } })

    flow.undo()
    const node = flow.getNode("node-1")
    expect(node.position.x).toBe(100)
    expect(node.position.y).toBe(200)
  })
})

describe("Copy/Paste", () => {
  let app, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    flow = await getFlow(app)
  })

  it("copySelection copies selected nodes", () => {
    flow.selectNode("node-1")
    flow.copySelection()
    expect(flow._clipboard.length).toBe(1)
    expect(flow._clipboard[0].id).toBe("node-1")
  })

  it("copySelection does nothing when nothing selected", () => {
    flow.copySelection()
    expect(flow._clipboard.length).toBe(0)
  })

  it("pasteClipboard creates new nodes", () => {
    flow.selectNode("node-1")
    flow.copySelection()
    flow.pasteClipboard()

    const nodes = flow.getNodes()
    const copiedNode = nodes.find(n => n.id !== "node-1" && n.position.x === 130)
    expect(copiedNode).toBeTruthy()
    expect(copiedNode.id).toContain("node-1-copy")
  })

  it("pasteClipboard offsets pasted nodes", () => {
    flow.selectNode("node-1")
    flow.copySelection()
    flow.pasteClipboard()

    const nodes = flow.getNodes()
    const copiedNode = nodes.find(n => n.id !== "node-1" && n.id.includes("copy"))
    expect(copiedNode.position.x).toBe(130) // 100 + 30
    expect(copiedNode.position.y).toBe(230) // 200 + 30
  })

  it("pasteClipboard does nothing when clipboard is empty", () => {
    flow.pasteClipboard() // should not throw
    expect(flow.getNodes().length).toBe(3)
  })

  it("copySelection includes edges between selected nodes", () => {
    flow.addEdge({ id: "e1", source: "node-1", target: "node-2" })
    flow.selectNode("node-1")
    flow.selectNode("node-2")
    flow.copySelection()

    const edges = flow._clipboard.filter(i => i.__isEdge)
    expect(edges.length).toBe(1)
    expect(edges[0].source).toBe("node-1")
  })

  it("pasteClipboard remaps edge source/target", () => {
    flow.addEdge({ id: "e1", source: "node-1", target: "node-2" })
    flow.selectNode("node-1")
    flow.selectNode("node-2")
    flow.copySelection()
    flow.pasteClipboard()

    const edges = flow.getEdges()
    const copiedEdge = edges.find(e => e.id !== "e1")
    expect(copiedEdge).toBeTruthy()
    const newNodes = flow.getNodes().filter(n => n.id.includes("copy"))
    expect(newNodes.length).toBe(2)
    const newIds = newNodes.map(n => n.id)
    expect(newIds).toContain(copiedEdge.source)
    expect(newIds).toContain(copiedEdge.target)
  })
})

describe("Smooth Viewport Animations", () => {
  let app, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    flow = await getFlow(app)
  })

  it("setViewportAnimated changes viewport over time", async () => {
    flow.setViewportAnimated({ x: 100, y: 200, zoom: 2 }, 100)
    // Wait for animation to complete
    await new Promise(r => setTimeout(r, 200))
    expect(flow.viewport.x).toBeCloseTo(100, 0)
    expect(flow.viewport.y).toBeCloseTo(200, 0)
    expect(flow.viewport.zoom).toBeCloseTo(2, 0)
  })

  it("zoomAtAnimated changes zoom toward target", async () => {
    const initialZoom = flow.viewport.zoom
    flow.zoomAtAnimated(0.5, { x: 400, y: 300 }, 100)
    await new Promise(r => setTimeout(r, 200))
    expect(flow.viewport.zoom).toBeCloseTo(initialZoom * 1.5, 0)
  })

  it("fitViewAnimated fits view with animation", async () => {
    flow.setViewport({ x: 5000, y: 5000, zoom: 0.01 })
    flow.fitViewAnimated(50, 100)
    await new Promise(r => setTimeout(r, 200))
    expect(flow.viewport.zoom).toBeGreaterThan(0.5)
  })

  it("setViewportAnimated cancels previous animation", async () => {
    flow.setViewportAnimated({ x: 100, y: 100, zoom: 1 }, 500)
    // Immediately start a new animation
    flow.setViewportAnimated({ x: 200, y: 200, zoom: 1 }, 100)
    await new Promise(r => setTimeout(r, 200))
    expect(flow.viewport.x).toBeCloseTo(200, 0)
  })
})

describe("fitView Options", () => {
  let app, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    flow = await getFlow(app)
  })

  it("fitView accepts number for backward compat", () => {
    flow.fitView(60)
    expect(flow.viewport.zoom).toBeGreaterThan(0)
  })

  it("fitView accepts options object with padding", () => {
    flow.fitView({ padding: 100 })
    expect(flow.viewport.zoom).toBeGreaterThan(0)
  })

  it("fitView respects maxZoom option", () => {
    flow.fitView({ padding: 10, maxZoom: 0.5 })
    expect(flow.viewport.zoom).toBeLessThanOrEqual(0.5)
  })

  it("fitView respects minZoom option", () => {
    flow.fitView({ padding: 10, minZoom: 2 })
    expect(flow.viewport.zoom).toBeGreaterThanOrEqual(2)
  })

  it("fitView with duration triggers animation", async () => {
    flow.fitView({ padding: 50, duration: 100 })
    await new Promise(r => setTimeout(r, 200))
    expect(flow.viewport.zoom).toBeGreaterThan(0)
  })
})

describe("defaultEdgeOptions", () => {
  let app, flow

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    flow = await getFlow(app)
  })

  it("has default edge options", () => {
    expect(flow.defaultEdgeOptionsValue).toBeTruthy()
    expect(flow.defaultEdgeOptionsValue.type).toBe("bezier")
    expect(flow.defaultEdgeOptionsValue.animated).toBe(false)
    expect(flow.defaultEdgeOptionsValue.markerEnd).toBe("arrow")
  })
})
