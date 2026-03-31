import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import PanelController from "../../src/controllers/panel_controller.js"

function setupDOM(position = "top-left") {
  document.body.innerHTML = `
    <div data-controller="flow-panel"
         data-flow-panel-position-value="${position}"
         class="panel-content">Panel</div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow-panel", PanelController)
  return app
}

async function getCtrl(app, el) {
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, "flow-panel")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  })
}

describe("PanelController", () => {
  let app, panelEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    panelEl = document.querySelector('[data-controller="flow-panel"]')
  })

  it("adds hf-panel class on connect", async () => {
    await getCtrl(app, panelEl)
    expect(panelEl.classList.contains("hf-panel")).toBe(true)
  })

  it("sets position absolute and z-index", async () => {
    await getCtrl(app, panelEl)
    expect(panelEl.style.position).toBe("absolute")
    expect(panelEl.style.zIndex).toBe("100")
  })

  it("positions top-left by default", async () => {
    await getCtrl(app, panelEl)
    expect(panelEl.style.top).toBe("16px")
    expect(panelEl.style.left).toBe("16px")
  })

  it("positions top-right", async () => {
    document.body.innerHTML = `
      <div data-controller="flow-panel"
           data-flow-panel-position-value="top-right">Panel</div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-panel"]')
    await getCtrl(app, el)
    expect(el.style.top).toBe("16px")
    expect(el.style.right).toBe("16px")
  })

  it("positions bottom-left", async () => {
    document.body.innerHTML = `
      <div data-controller="flow-panel"
           data-flow-panel-position-value="bottom-left">Panel</div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-panel"]')
    await getCtrl(app, el)
    expect(el.style.bottom).toBe("16px")
    expect(el.style.left).toBe("16px")
  })

  it("positions bottom-right", async () => {
    document.body.innerHTML = `
      <div data-controller="flow-panel"
           data-flow-panel-position-value="bottom-right">Panel</div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-panel"]')
    await getCtrl(app, el)
    expect(el.style.bottom).toBe("16px")
    expect(el.style.right).toBe("16px")
  })

  it("positions top-center with transform", async () => {
    document.body.innerHTML = `
      <div data-controller="flow-panel"
           data-flow-panel-position-value="top-center">Panel</div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-panel"]')
    await getCtrl(app, el)
    expect(el.style.top).toBe("16px")
    expect(el.style.left).toBe("50%")
    expect(el.style.transform).toBe("translateX(-50%)")
  })

  it("positions bottom-center with transform", async () => {
    document.body.innerHTML = `
      <div data-controller="flow-panel"
           data-flow-panel-position-value="bottom-center">Panel</div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-panel"]')
    await getCtrl(app, el)
    expect(el.style.bottom).toBe("16px")
    expect(el.style.left).toBe("50%")
    expect(el.style.transform).toBe("translateX(-50%)")
  })

  it("falls back to top-left for unknown position", async () => {
    document.body.innerHTML = `
      <div data-controller="flow-panel"
           data-flow-panel-position-value="unknown-pos">Panel</div>
    `
    app = startApp()
    const el = document.querySelector('[data-controller="flow-panel"]')
    await getCtrl(app, el)
    expect(el.style.top).toBe("16px")
    expect(el.style.left).toBe("16px")
  })
})
