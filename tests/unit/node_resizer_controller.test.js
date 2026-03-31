import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import NodeResizerController from "../../src/controllers/node_resizer_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-flow-node="n1" style="left:100px;top:100px;width:200px;height:120px;position:absolute">
      <div data-controller="flow-node-resizer"
           data-flow-node-resizer-node-id-value="n1"
           data-flow-node-resizer-min-width-value="50"
           data-flow-node-resizer-min-height-value="30"
           data-flow-node-resizer-max-width-value="500"
           data-flow-node-resizer-max-height-value="500"></div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow-node-resizer", NodeResizerController)
  return app
}

async function getCtrl(app, el) {
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, "flow-node-resizer")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  })
}

describe("NodeResizerController", () => {
  let app, resizerEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    resizerEl = document.querySelector('[data-controller="flow-node-resizer"]')
  })

  it("adds hf-node-resizer class on connect", async () => {
    await getCtrl(app, resizerEl)
    expect(resizerEl.classList.contains("hf-node-resizer")).toBe(true)
  })

  it("creates 8 resize handles", async () => {
    await getCtrl(app, resizerEl)
    const handles = resizerEl.querySelectorAll(".hf-resize-handle")
    expect(handles.length).toBe(8)
  })

  it("creates handles with correct position data attributes", async () => {
    await getCtrl(app, resizerEl)
    const positions = ["se", "sw", "ne", "nw", "n", "s", "e", "w"]
    positions.forEach(pos => {
      const handle = resizerEl.querySelector(`[data-resize-position="${pos}"]`)
      expect(handle).toBeTruthy()
    })
  })

  it("has correct cursor styles on handles", async () => {
    await getCtrl(app, resizerEl)
    const se = resizerEl.querySelector('[data-resize-position="se"]')
    expect(se.style.cssText).toContain("se-resize")
    const nw = resizerEl.querySelector('[data-resize-position="nw"]')
    expect(nw.style.cssText).toContain("nw-resize")
  })

  it("stores min/max width/height values", async () => {
    const ctrl = await getCtrl(app, resizerEl)
    expect(ctrl.minWidthValue).toBe(50)
    expect(ctrl.minHeightValue).toBe(30)
    expect(ctrl.maxWidthValue).toBe(500)
    expect(ctrl.maxHeightValue).toBe(500)
  })

  it("dispatches resizestart on pointerdown", async () => {
    const ctrl = await getCtrl(app, resizerEl)
    const handler = vi.fn()
    resizerEl.addEventListener("flow-node-resizer:resizestart", handler)

    const handle = resizerEl.querySelector('[data-resize-position="se"]')
    handle.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 200, clientY: 200, bubbles: true
    }))

    expect(handler).toHaveBeenCalled()
  })

  it("dispatches resize on pointermove during resize", async () => {
    const ctrl = await getCtrl(app, resizerEl)
    const handler = vi.fn()
    resizerEl.addEventListener("flow-node-resizer:resize", handler)

    const handle = resizerEl.querySelector('[data-resize-position="se"]')
    handle.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 200, clientY: 200, bubbles: true
    }))

    document.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 250, clientY: 250, bubbles: true
    }))

    expect(handler).toHaveBeenCalled()
    const detail = handler.mock.calls[0][0].detail
    expect(detail).toHaveProperty("width")
    expect(detail).toHaveProperty("height")
  })

  it("dispatches resizeend on pointerup", async () => {
    const ctrl = await getCtrl(app, resizerEl)
    const handler = vi.fn()
    resizerEl.addEventListener("flow-node-resizer:resizeend", handler)

    const handle = resizerEl.querySelector('[data-resize-position="se"]')
    handle.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 200, clientY: 200, bubbles: true
    }))
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))

    expect(handler).toHaveBeenCalled()
  })

  it("respects min width constraint when resizing west", async () => {
    const ctrl = await getCtrl(app, resizerEl)
    const handler = vi.fn()
    resizerEl.addEventListener("flow-node-resizer:resize", handler)

    const handle = resizerEl.querySelector('[data-resize-position="w"]')
    handle.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 100, clientY: 160, bubbles: true
    }))

    // Move far right to shrink width below min
    document.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 500, clientY: 160, bubbles: true
    }))

    expect(handler).toHaveBeenCalled()
    const detail = handler.mock.calls[0][0].detail
    expect(detail.width).toBeGreaterThanOrEqual(50)
  })

  it("cleans up event listeners on pointerup", async () => {
    const ctrl = await getCtrl(app, resizerEl)
    const handle = resizerEl.querySelector('[data-resize-position="se"]')

    handle.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 200, clientY: 200, bubbles: true
    }))
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))

    // Further pointermove should not trigger resize
    const handler = vi.fn()
    resizerEl.addEventListener("flow-node-resizer:resize", handler)
    document.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 300, clientY: 300, bubbles: true
    }))
    expect(handler).not.toHaveBeenCalled()
  })
})
