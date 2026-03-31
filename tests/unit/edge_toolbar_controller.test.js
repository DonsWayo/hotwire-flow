import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import EdgeToolbarController from "../../src/controllers/edge_toolbar_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow-edge-toolbar">
      <button data-action="click->flow-edge-toolbar#deleteEdge">Delete</button>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow-edge-toolbar", EdgeToolbarController)
  return app
}

async function getCtrl(app, el) {
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, "flow-edge-toolbar")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  })
}

describe("EdgeToolbarController", () => {
  let app, toolbarEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    toolbarEl = document.querySelector('[data-controller="flow-edge-toolbar"]')
  })

  it("adds hf-edge-toolbar class on connect", async () => {
    await getCtrl(app, toolbarEl)
    expect(toolbarEl.classList.contains("hf-edge-toolbar")).toBe(true)
  })

  it("starts hidden", async () => {
    await getCtrl(app, toolbarEl)
    expect(toolbarEl.style.display).toBe("none")
  })

  it("shows on edgeclick event", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    document.dispatchEvent(new CustomEvent("hotwire-flow:edgeclick", {
      detail: { edgeId: "e1" }
    }))
    expect(toolbarEl.style.display).toBe("flex")
    expect(ctrl.edgeIdValue).toBe("e1")
  })

  it("hide() hides the toolbar", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    document.dispatchEvent(new CustomEvent("hotwire-flow:edgeclick", {
      detail: { edgeId: "e1" }
    }))
    expect(toolbarEl.style.display).toBe("flex")
    ctrl.hide()
    expect(toolbarEl.style.display).toBe("none")
  })

  it("deleteEdge dispatches edgedelete event", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    ctrl.edgeIdValue = "e1"

    const handler = vi.fn()
    document.addEventListener("hotwire-flow:edgedelete", handler)

    ctrl.deleteEdge()

    expect(handler).toHaveBeenCalled()
    expect(handler.mock.calls[0][0].detail.edgeId).toBe("e1")
    expect(toolbarEl.style.display).toBe("none")
  })

  it("deleteEdge does nothing when no edge is selected", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    ctrl.edgeIdValue = ""

    const handler = vi.fn()
    document.addEventListener("hotwire-flow:edgedelete", handler)

    ctrl.deleteEdge()
    expect(handler).not.toHaveBeenCalled()
  })

  it("cleans up listeners on disconnect", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    ctrl.disconnect()
    // Should not throw
    document.dispatchEvent(new CustomEvent("hotwire-flow:edgeclick", {
      detail: { edgeId: "e1" }
    }))
    expect(toolbarEl.style.display).toBe("none")
  })
})
