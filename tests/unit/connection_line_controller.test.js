import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import ConnectionLineController from "../../src/controllers/connection_line_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <svg>
      <path data-controller="flow-connection-line" style="display:none" />
    </svg>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow-connection-line", ConnectionLineController)
  return app
}

async function getCtrl(app, el) {
  return vi.waitFor(() => {
    const ctrl = app.getControllerForElementAndIdentifier(el, "flow-connection-line")
    if (!ctrl) throw new Error("Not ready")
    return ctrl
  })
}

describe("ConnectionLineController", () => {
  let app, lineEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    lineEl = document.querySelector('[data-controller="flow-connection-line"]')
  })

  it("adds hf-connection-line class on connect", async () => {
    await getCtrl(app, lineEl)
    expect(lineEl.classList.contains("hf-connection-line")).toBe(true)
  })

  it("starts hidden", async () => {
    await getCtrl(app, lineEl)
    expect(lineEl.style.display).toBe("none")
  })

  it("shows on connectionstart event", async () => {
    const ctrl = await getCtrl(app, lineEl)
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionstart", {
      detail: { position: { x: 100, y: 200 } }
    }))
    expect(lineEl.style.display).toBe("block")
    expect(ctrl.sourcePosition).toEqual({ x: 100, y: 200 })
  })

  it("updates path on connectionmove event", async () => {
    const ctrl = await getCtrl(app, lineEl)
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionstart", {
      detail: { position: { x: 100, y: 200 } }
    }))
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionmove", {
      detail: { x: 300, y: 400 }
    }))
    expect(lineEl.getAttribute("d")).toBeTruthy()
    expect(lineEl.getAttribute("d")).toContain("M 100 200")
    expect(lineEl.getAttribute("d")).toContain("300 400")
  })

  it("renders bezier curve with C command", async () => {
    await getCtrl(app, lineEl)
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionstart", {
      detail: { position: { x: 0, y: 0 } }
    }))
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionmove", {
      detail: { x: 200, y: 0 }
    }))
    expect(lineEl.getAttribute("d")).toContain("C")
  })

  it("hides on connectionend event", async () => {
    const ctrl = await getCtrl(app, lineEl)
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionstart", {
      detail: { position: { x: 100, y: 200 } }
    }))
    expect(lineEl.style.display).toBe("block")
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionend"))
    expect(lineEl.style.display).toBe("none")
    expect(lineEl.hasAttribute("d")).toBe(false)
    expect(ctrl.sourcePosition).toBeNull()
    expect(ctrl.targetPosition).toBeNull()
  })

  it("hides on connectioncancel event", async () => {
    await getCtrl(app, lineEl)
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionstart", {
      detail: { position: { x: 100, y: 200 } }
    }))
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectioncancel"))
    expect(lineEl.style.display).toBe("none")
    expect(lineEl.hasAttribute("d")).toBe(false)
  })

  it("cleans up listeners on disconnect", async () => {
    const ctrl = await getCtrl(app, lineEl)
    ctrl.disconnect()
    // Events after disconnect should not throw
    document.dispatchEvent(new CustomEvent("hotwire-flow:connectionstart", {
      detail: { position: { x: 100, y: 200 } }
    }))
    expect(lineEl.style.display).toBe("none")
  })

  it("does not render if source or target is null", async () => {
    const ctrl = await getCtrl(app, lineEl)
    ctrl._render()
    expect(lineEl.hasAttribute("d")).toBe(false)
  })
})
