import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import ContextMenuController from "../../src/controllers/context_menu_controller.js"
import FlowController from "../../src/controllers/flow_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="n1" style="left:100px;top:100px;width:100px;height:60px;position:absolute">N</div>
        </div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
      <div data-controller="flow-context-menu"
           data-flow-context-menu-flow-outlet="#canvas"
           class="hf-context-menu"
           style="display:none">
        <button data-action="click->flow-context-menu#addNodeHere" class="hf-context-menu-item">Add</button>
        <button data-action="click->flow-context-menu#duplicateNode" class="hf-context-menu-item">Dup</button>
        <button data-action="click->flow-context-menu#deleteNode" class="hf-context-menu-item">Del</button>
      </div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  app.register("flow-context-menu", ContextMenuController)
  return app
}

async function getController(app, el, id) {
  return await vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, id)
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  }, { timeout: 3000 })
}

describe("ContextMenuController", () => {
  let app, menuEl, canvas

  beforeEach(() => {
    setupDOM()
    app = startApp()
    menuEl = document.querySelector('[data-controller="flow-context-menu"]')
    canvas = document.getElementById("canvas")
  })

  it("shows on context menu event", async () => {
    await getController(app, menuEl, "flow-context-menu")

    canvas.dispatchEvent(new CustomEvent("hotwire-flow:contextmenu", {
      detail: { x: 300, y: 200, nodeId: "n1", flowPosition: { x: 200, y: 100 } }
    }))

    expect(menuEl.style.display).toBe("block")
    expect(menuEl.style.left).toBe("300px")
    expect(menuEl.style.top).toBe("200px")
  })

  it("dispatches addnode event", async () => {
    await getController(app, menuEl, "flow-context-menu")

    const handler = vi.fn()
    menuEl.addEventListener("hotwire-flow:addnode", handler)

    // Show menu
    canvas.dispatchEvent(new CustomEvent("hotwire-flow:contextmenu", {
      detail: { x: 300, y: 200, nodeId: null, flowPosition: { x: 250, y: 150 } }
    }))

    // Click add
    menuEl.querySelector('[data-action*="addNodeHere"]').click()
    expect(handler).toHaveBeenCalled()
    expect(handler.mock.calls[0][0].detail).toEqual({ x: 250, y: 150 })
  })

  it("dispatches delete event", async () => {
    await getController(app, menuEl, "flow-context-menu")

    const handler = vi.fn()
    menuEl.addEventListener("hotwire-flow:delete", handler)

    canvas.dispatchEvent(new CustomEvent("hotwire-flow:contextmenu", {
      detail: { x: 300, y: 200, nodeId: "n1", flowPosition: { x: 100, y: 100 } }
    }))

    menuEl.querySelector('[data-action*="deleteNode"]').click()
    expect(handler).toHaveBeenCalled()
    expect(handler.mock.calls[0][0].detail).toEqual({ nodeId: "n1" })
  })

  it("dispatches duplicate event", async () => {
    await getController(app, menuEl, "flow-context-menu")

    const handler = vi.fn()
    menuEl.addEventListener("hotwire-flow:duplicate", handler)

    canvas.dispatchEvent(new CustomEvent("hotwire-flow:contextmenu", {
      detail: { x: 300, y: 200, nodeId: "n1", flowPosition: { x: 100, y: 100 } }
    }))

    menuEl.querySelector('[data-action*="duplicateNode"]').click()
    expect(handler).toHaveBeenCalled()
    expect(handler.mock.calls[0][0].detail).toEqual({ nodeId: "n1" })
  })
})
