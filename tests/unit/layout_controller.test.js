import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import LayoutController from "../../src/controllers/layout_controller.js"
import FlowController from "../../src/controllers/flow_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="flow-canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="a" data-flow-node-id-value="a"
               style="left:0;top:0;width:150px;height:60px;position:absolute">A</div>
          <div data-flow-node="b" data-flow-node-id-value="b"
               style="left:300;top:0;width:150px;height:60px;position:absolute">B</div>
          <div data-flow-node="c" data-flow-node-id-value="c"
               style="left:150;top:200;width:150px;height:60px;position:absolute">C</div>
        </div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
      <div data-controller="flow-layout"
           data-flow-layout-flow-outlet="#flow-canvas"
           data-flow-layout-direction-value="TB"
           data-flow-layout-node-spacing-value="80"
           data-flow-layout-rank-spacing-value="150">
      </div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  app.register("flow-layout", LayoutController)
  return app
}

async function getCtrl(app, el) {
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, "flow-layout")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  })
}

async function getFlow(app) {
  const canvas = document.getElementById("flow-canvas")
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  })
}

describe("LayoutController", () => {
  let app, layoutEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    layoutEl = document.querySelector('[data-controller="flow-layout"]')
  })

  it("adds hf-layout-controls class on connect", async () => {
    await getCtrl(app, layoutEl)
    expect(layoutEl.classList.contains("hf-layout-controls")).toBe(true)
  })

  it("has default values", async () => {
    const ctrl = await getCtrl(app, layoutEl)
    expect(ctrl.directionValue).toBe("TB")
    expect(ctrl.nodeSpacingValue).toBe(80)
    expect(ctrl.rankSpacingValue).toBe(150)
  })

  it("layoutVertical calls _applyLayout with TB", async () => {
    const ctrl = await getCtrl(app, layoutEl)
    const spy = vi.spyOn(ctrl, "_applyLayout")
    ctrl.layoutVertical()
    expect(spy).toHaveBeenCalledWith("TB")
  })

  it("layoutHorizontal calls _applyLayout with LR", async () => {
    const ctrl = await getCtrl(app, layoutEl)
    const spy = vi.spyOn(ctrl, "_applyLayout")
    ctrl.layoutHorizontal()
    expect(spy).toHaveBeenCalledWith("LR")
  })

  it("dispatches layout event after layout", async () => {
    const ctrl = await getCtrl(app, layoutEl)
    const handler = vi.fn()
    document.addEventListener("hotwire-flow:layout", handler)

    ctrl.layoutVertical()

    expect(handler).toHaveBeenCalled()
    const detail = handler.mock.calls[0][0].detail
    expect(detail.direction).toBe("TB")
    expect(detail.positions).toBeTruthy()
  })

  it("moves nodes to new positions", async () => {
    const ctrl = await getCtrl(app, layoutEl)
    ctrl.layoutVertical()

    const nodeA = document.querySelector('[data-flow-node="a"]')
    const nodeB = document.querySelector('[data-flow-node="b"]')
    // After layout, nodes should have new positions
    expect(nodeA.style.left).toBeTruthy()
    expect(nodeB.style.left).toBeTruthy()
  })

  it("applies transition animation", async () => {
    const ctrl = await getCtrl(app, layoutEl)
    ctrl.layoutVertical()

    const nodeA = document.querySelector('[data-flow-node="a"]')
    expect(nodeA.style.transition).toContain("left")
    expect(nodeA.style.transition).toContain("top")
  })

  it("does nothing when no nodes exist", async () => {
    // Remove all nodes
    document.querySelectorAll("[data-flow-node]").forEach(n => n.remove())

    const ctrl = await getCtrl(app, layoutEl)
    const flow = await getFlow(app)
    // Mock getNodes to return empty
    vi.spyOn(flow, "getNodes").mockReturnValue([])

    const handler = vi.fn()
    document.addEventListener("hotwire-flow:layout", handler)

    ctrl.layoutVertical()
    expect(handler).not.toHaveBeenCalled()
  })

  it("removes transition after timeout", async () => {
    vi.useFakeTimers()
    const ctrl = await getCtrl(app, layoutEl)
    ctrl.layoutVertical()

    const nodeA = document.querySelector('[data-flow-node="a"]')
    expect(nodeA.style.transition).toBeTruthy()

    vi.advanceTimersByTime(500)
    expect(nodeA.style.transition).toBe("")

    vi.useRealTimers()
  })
})
