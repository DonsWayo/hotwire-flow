import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import EdgeController from "../../src/controllers/edge_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div id="canvas" class="hf-canvas">
      <div data-flow-target="pane" class="hf-pane">
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1">
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e1"
                data-flow-edge-source-value="n1"
                data-flow-edge-target-value="n2"
                data-flow-edge-type-value="bezier"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e2"
                data-flow-edge-source-value="n1"
                data-flow-edge-target-value="n2"
                data-flow-edge-type-value="bezier"
                data-flow-edge-animated-value="true"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e3"
                data-flow-edge-source-value="n1"
                data-flow-edge-target-value="n2"
                data-flow-edge-type-value="bezier"
                data-flow-edge-label-value="hello world"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e4"
                data-flow-edge-source-value="n1"
                data-flow-edge-target-value="n2"
                data-flow-edge-type-value="bezier"
                data-flow-edge-marker-end-value="arrow"
                data-flow-edge-marker-color-value="#ef4444"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e5"
                data-flow-edge-source-value="n1"
                data-flow-edge-target-value="n2"
                data-flow-edge-type-value="bezier"
                data-flow-edge-hidden-value="true"
                class="hf-edge" />
          <path data-controller="flow-edge"
                data-flow-edge-id-value="e6"
                data-flow-edge-source-value="n1"
                data-flow-edge-target-value="n2"
                data-flow-edge-type-value="bezier"
                data-flow-edge-selectable-value="true"
                class="hf-edge" />
        </svg>
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="n1" style="left:100px;top:200px;width:150px;height:80px;position:absolute">N1</div>
          <div data-flow-node="n2" style="left:400px;top:200px;width:150px;height:80px;position:absolute">N2</div>
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

async function getEdge(app, el) {
  return await vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, "flow-edge")
    if (!ctrl || !el.getAttribute("d")) throw new Error("Not ready")
    return ctrl
  }, { timeout: 3000 })
}

describe("Edge: animated", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("adds animated class when animated=true", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e2"]')
    await getEdge(app, el)
    expect(el.classList.contains("animated")).toBe(true)
  })

  it("does not add animated class when animated=false", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e1"]')
    await getEdge(app, el)
    expect(el.classList.contains("animated")).toBe(false)
  })
})

describe("Edge: labels", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("creates foreignObject for labeled edges", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e3"]')
    await getEdge(app, el)
    await new Promise(r => setTimeout(r, 100))
    const labels = document.querySelectorAll("foreignObject")
    expect(labels.length).toBeGreaterThanOrEqual(1)
    const labelText = labels[0]?.textContent
    expect(labelText).toContain("hello world")
  })
})

describe("Edge: markers", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("creates SVG marker element when marker-end=arrow", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e4"]')
    await getEdge(app, el)
    await new Promise(r => setTimeout(r, 100))
    const markers = document.querySelectorAll("marker")
    expect(markers.length).toBeGreaterThanOrEqual(1)
    const marker = markers[0]
    expect(marker.querySelector("path")).toBeTruthy()
  })

  it("sets marker-end attribute on edge path", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e4"]')
    await getEdge(app, el)
    expect(el.getAttribute("marker-end")).toContain("url(#")
  })
})

describe("Edge: hidden", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("hides edge when hidden=true", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e5"]')
    await getEdge(app, el)
    expect(el.style.display).toBe("none")
  })
})

describe("Edge: selection", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("select adds selected class", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e6"]')
    const ctrl = await getEdge(app, el)
    ctrl.select()
    expect(el.classList.contains("selected")).toBe(true)
  })

  it("deselect removes selected class", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e6"]')
    const ctrl = await getEdge(app, el)
    ctrl.select()
    ctrl.deselect()
    expect(el.classList.contains("selected")).toBe(false)
  })
})

describe("Edge: path types", () => {
  let app

  beforeEach(() => { setupDOM(); app = startApp() })

  it("bezier path contains C command", async () => {
    const el = document.querySelector('[data-flow-edge-id-value="e1"]')
    await getEdge(app, el)
    expect(el.getAttribute("d")).toContain("C ")
  })

  it("all edges have valid d attribute", async () => {
    const edges = document.querySelectorAll("path.hf-edge")
    await vi.waitFor(() => {
      const allHaveD = Array.from(edges).every(e => !!e.getAttribute("d"))
      if (!allHaveD) throw new Error("Edges not ready")
    }, { timeout: 3000 })
  })
})
