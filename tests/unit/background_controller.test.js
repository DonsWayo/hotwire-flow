import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import BackgroundController from "../../src/controllers/background_controller.js"
import FlowController from "../../src/controllers/flow_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <div data-flow-target="nodes" class="hf-nodes"></div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
      <div data-controller="flow-background"
           data-flow-background-flow-outlet="#canvas"
           data-flow-background-variant-value="dots"
           data-flow-background-gap-value="20"
           class="absolute inset-0"></div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  app.register("flow-background", BackgroundController)
  return app
}

describe("BackgroundController", () => {
  let app, bgEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    bgEl = document.querySelector('[data-controller="flow-background"]')
  })

  it("sets dots background", async () => {
    await vi.waitFor(() => app.getControllerForElementAndIdentifier(bgEl, "flow-background"))
    expect(bgEl.style.backgroundImage).toContain("radial-gradient")
  })

  it("changes variant to grid", async () => {
    await vi.waitFor(() => app.getControllerForElementAndIdentifier(bgEl, "flow-background"))
    const ctrl = app.getControllerForElementAndIdentifier(bgEl, "flow-background")

    ctrl.variantValue = "grid"
    ctrl._render()
    expect(bgEl.style.backgroundImage).toContain("linear-gradient")
  })

  it("changes variant to lines", async () => {
    await vi.waitFor(() => app.getControllerForElementAndIdentifier(bgEl, "flow-background"))
    const ctrl = app.getControllerForElementAndIdentifier(bgEl, "flow-background")

    ctrl.variantValue = "lines"
    ctrl._render()
    expect(bgEl.style.backgroundImage).toContain("linear-gradient")
  })

  it("hides background for none variant", async () => {
    await vi.waitFor(() => app.getControllerForElementAndIdentifier(bgEl, "flow-background"))
    const ctrl = app.getControllerForElementAndIdentifier(bgEl, "flow-background")

    ctrl.variantValue = "none"
    ctrl._render()
    expect(bgEl.style.backgroundImage).toBe("none")
  })

  it("updates offset on viewport change", async () => {
    await vi.waitFor(() => app.getControllerForElementAndIdentifier(bgEl, "flow-background"))
    const canvas = document.getElementById("canvas")
    const flowCtrl = app.getControllerForElementAndIdentifier(canvas, "flow")

    flowCtrl.setViewport({ x: 40, y: 20, zoom: 1 })

    // Background should have offset
    expect(bgEl.style.backgroundPosition).toBeTruthy()
  })
})
