import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import NodeToolbarController from "../../src/controllers/node_toolbar_controller.js"

function setupDOM(position = "top") {
  document.body.innerHTML = `
    <div data-flow-node="n1" class="hf-node" style="left:100px;top:100px;width:150px;height:80px;position:absolute">
      <div data-controller="flow-node-toolbar"
           data-flow-node-toolbar-position-value="${position}"
           data-flow-node-toolbar-offset-value="10"
           data-flow-node-toolbar-is-visible-value="false">
        <button>Edit</button>
      </div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow-node-toolbar", NodeToolbarController)
  return app
}

async function getCtrl(app, el) {
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, "flow-node-toolbar")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  })
}

describe("NodeToolbarController", () => {
  let app, toolbarEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    toolbarEl = document.querySelector('[data-controller="flow-node-toolbar"]')
  })

  it("adds hf-node-toolbar class on connect", async () => {
    await getCtrl(app, toolbarEl)
    expect(toolbarEl.classList.contains("hf-node-toolbar")).toBe(true)
  })

  it("starts hidden when isVisible is false", async () => {
    await getCtrl(app, toolbarEl)
    expect(toolbarEl.style.display).toBe("none")
  })

  it("starts visible when isVisible is true", async () => {
    document.body.innerHTML = `
      <div data-flow-node="n1" class="hf-node">
        <div data-controller="flow-node-toolbar"
             data-flow-node-toolbar-is-visible-value="true"
             data-flow-node-toolbar-position-value="top">
          <button>Edit</button>
        </div>
      </div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-node-toolbar"]')
    await getCtrl(app, el)
    expect(el.style.display).toBe("flex")
  })

  it("show() makes toolbar visible", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    expect(toolbarEl.style.display).toBe("none")
    ctrl.show()
    expect(toolbarEl.style.display).toBe("flex")
  })

  it("hide() makes toolbar hidden", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    ctrl.show()
    expect(toolbarEl.style.display).toBe("flex")
    ctrl.hide()
    expect(toolbarEl.style.display).toBe("none")
  })

  it("positions above node for top position", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    ctrl.show()
    expect(toolbarEl.style.bottom).toBe("100%")
    expect(toolbarEl.style.left).toBe("50%")
    expect(toolbarEl.style.transform).toBe("translateX(-50%)")
    expect(toolbarEl.style.marginBottom).toBe("10px")
  })

  it("positions below node for bottom position", async () => {
    document.body.innerHTML = `
      <div data-flow-node="n1" class="hf-node">
        <div data-controller="flow-node-toolbar"
             data-flow-node-toolbar-position-value="bottom"
             data-flow-node-toolbar-offset-value="15">
          <button>Edit</button>
        </div>
      </div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-node-toolbar"]')
    const ctrl = await getCtrl(app, el)
    ctrl.show()
    expect(el.style.top).toBe("100%")
    expect(el.style.left).toBe("50%")
    expect(el.style.transform).toBe("translateX(-50%)")
    expect(el.style.marginTop).toBe("15px")
  })

  it("shows when node is selected", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    const nodeEl = document.querySelector('[data-flow-node="n1"]')
    nodeEl.classList.add("selected")
    document.dispatchEvent(new CustomEvent("hotwire-flow:nodeselect", {
      detail: { nodeId: "n1" }
    }))
    expect(toolbarEl.style.display).toBe("flex")
  })

  it("hides when node is deselected", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    ctrl.show()
    const nodeEl = document.querySelector('[data-flow-node="n1"]')
    nodeEl.classList.remove("selected")
    document.dispatchEvent(new CustomEvent("hotwire-flow:nodedeselect", {
      detail: { nodeId: "n1" }
    }))
    expect(toolbarEl.style.display).toBe("none")
  })

  it("cleans up listeners on disconnect", async () => {
    const ctrl = await getCtrl(app, toolbarEl)
    ctrl.disconnect()
    // Should not throw
    document.dispatchEvent(new CustomEvent("hotwire-flow:nodeselect", { detail: { nodeId: "n1" } }))
  })
})
