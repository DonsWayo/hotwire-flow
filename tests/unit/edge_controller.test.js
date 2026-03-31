import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import EdgeController from "../../src/controllers/edge_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1">
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e1"
                data-flow-edge-source-value="n1"
                data-flow-edge-source-handle-value="right"
                data-flow-edge-target-value="n2"
                data-flow-edge-target-handle-value="left"
                data-flow-edge-type-value="bezier"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e2"
                data-flow-edge-source-value="n1"
                data-flow-edge-source-handle-value="right"
                data-flow-edge-target-value="n2"
                data-flow-edge-target-handle-value="left"
                data-flow-edge-type-value="straight"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e3"
                data-flow-edge-source-value="n1"
                data-flow-edge-source-handle-value="bottom"
                data-flow-edge-target-value="n2"
                data-flow-edge-target-handle-value="top"
                data-flow-edge-type-value="step"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e4"
                data-flow-edge-source-value="n1"
                data-flow-edge-source-handle-value="right"
                data-flow-edge-target-value="n2"
                data-flow-edge-target-handle-value="left"
                data-flow-edge-type-value="smoothstep"
                data-flow-edge-animated-value="true"
                class="hf-edge" />
        </svg>
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="n1" style="left:100px;top:200px;width:150px;height:80px;position:absolute">Node 1</div>
          <div data-flow-node="n2" style="left:400px;top:200px;width:150px;height:80px;position:absolute">Node 2</div>
        </div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow-edge", EdgeController)
  return app
}

describe("EdgeController", () => {
  let app

  beforeEach(() => {
    setupDOM()
    app = startApp()
  })

  it("sets data-edge attribute on connect", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e1"]')
    await vi.waitFor(() => {
      if (!edgeEl.dataset.edge) throw new Error("Not connected")
      return true
    }, { timeout: 3000 })
    expect(edgeEl.dataset.edge).toBe("e1")
  })

  it("adds hf-edge class on connect", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e1"]')
    await vi.waitFor(() => {
      if (!edgeEl.classList.contains("hf-edge")) throw new Error("No class")
      return true
    })
    expect(edgeEl.classList.contains("hf-edge")).toBe(true)
  })

  it("adds animated class when animated", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e4"]')
    await vi.waitFor(() => {
      if (!edgeEl.classList.contains("animated")) throw new Error("No animated class")
      return true
    })
    expect(edgeEl.classList.contains("animated")).toBe(true)
  })

  it("draws bezier path", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e1"]')
    await vi.waitFor(() => {
      const d = edgeEl.getAttribute("d")
      if (!d) throw new Error("No d attribute")
      return true
    }, { timeout: 3000 })
    const d = edgeEl.getAttribute("d")
    expect(d).toContain("M ")
    expect(d).toContain("C ")
  })

  it("draws straight path", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e2"]')
    await vi.waitFor(() => {
      if (!edgeEl.getAttribute("d")) throw new Error("No d")
      return true
    }, { timeout: 3000 })
    const d = edgeEl.getAttribute("d")
    expect(d).toContain("L ")
  })

  it("draws step path", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e3"]')
    await vi.waitFor(() => {
      if (!edgeEl.getAttribute("d")) throw new Error("No d")
      return true
    }, { timeout: 3000 })
    const d = edgeEl.getAttribute("d")
    expect(d).toContain("L ")
    expect(d).toContain("M ")
  })

  it("draws smoothstep path", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e4"]')
    await vi.waitFor(() => {
      if (!edgeEl.getAttribute("d")) throw new Error("No d")
      return true
    }, { timeout: 3000 })
    expect(edgeEl.getAttribute("d")).toBeTruthy()
  })

  it("updates path when node moves", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e1"]')
    await vi.waitFor(() => {
      if (!edgeEl.getAttribute("d")) throw new Error("No d")
      return true
    }, { timeout: 3000 })

    const dBefore = edgeEl.getAttribute("d")

    // Move node-1
    const node1 = document.querySelector('[data-flow-node="n1"]')
    node1.style.left = "200px"
    node1.style.top = "300px"

    document.dispatchEvent(new CustomEvent("hotwire-flow:nodemove", {
      detail: { nodeId: "n1", x: 200, y: 300 }
    }))

    await new Promise(r => setTimeout(r, 50))
    const dAfter = edgeEl.getAttribute("d")
    expect(dAfter).not.toBe(dBefore)
  })

  it("selects and deselects", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e1"]')
    await vi.waitFor(() => {
      if (!edgeEl.dataset.edge) throw new Error("Not connected")
      return true
    })
    const ctrl = app.getControllerForElementAndIdentifier(edgeEl, "flow-edge")

    ctrl.select()
    expect(edgeEl.classList.contains("selected")).toBe(true)

    ctrl.deselect()
    expect(edgeEl.classList.contains("selected")).toBe(false)
  })

  it("cleans up on disconnect", async () => {
    const edgeEl = document.querySelector('[data-flow-edge-id-value="e1"]')
    await vi.waitFor(() => {
      if (!edgeEl.dataset.edge) throw new Error("Not connected")
      return true
    })
    const ctrl = app.getControllerForElementAndIdentifier(edgeEl, "flow-edge")
    expect(() => ctrl.disconnect()).not.toThrow()
  })
})
