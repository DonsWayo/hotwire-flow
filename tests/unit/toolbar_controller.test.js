import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import FlowController from "../../src/controllers/flow_controller.js"
import ToolbarController from "../../src/controllers/toolbar_controller.js"

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
      <div class="hf-controls" data-controller="flow-toolbar" data-flow-toolbar-flow-outlet="#canvas">
        <button data-action="click->flow-toolbar#zoomIn" class="hf-control-btn">+</button>
        <span data-flow-toolbar-target="zoomLevel">100%</span>
        <button data-action="click->flow-toolbar#zoomOut" class="hf-control-btn">−</button>
        <button data-action="click->flow-toolbar#fitView" class="hf-control-btn">fit</button>
        <button data-action="click->flow-toolbar#resetView" class="hf-control-btn">reset</button>
      </div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  app.register("flow-toolbar", ToolbarController)
  return app
}

describe("ToolbarController", () => {
  let app, canvas, toolbarEl

  beforeEach(async () => {
    setupDOM()
    app = startApp()
    canvas = document.getElementById("canvas")
    toolbarEl = document.querySelector('[data-controller="flow-toolbar"]')
    await new Promise(r => setTimeout(r, 200))
  })

  it("zooms in via button", () => {
    const flowCtrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    const toolbarCtrl = app.getControllerForElementAndIdentifier(toolbarEl, "flow-toolbar")
    const zoomBefore = flowCtrl.viewport.zoom
    toolbarCtrl.zoomIn()
    expect(flowCtrl.viewport.zoom).toBeGreaterThan(zoomBefore)
  })

  it("zooms out via button", () => {
    const flowCtrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    const toolbarCtrl = app.getControllerForElementAndIdentifier(toolbarEl, "flow-toolbar")
    flowCtrl.setViewport({ zoom: 2 })
    toolbarCtrl.zoomOut()
    expect(flowCtrl.viewport.zoom).toBeLessThan(2)
  })

  it("fits view via button", () => {
    const flowCtrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    const toolbarCtrl = app.getControllerForElementAndIdentifier(toolbarEl, "flow-toolbar")
    // fitView with one node should produce a reasonable zoom
    toolbarCtrl.fitView()
    expect(flowCtrl.viewport.zoom).toBeGreaterThan(0)
    expect(flowCtrl.viewport.zoom).toBeLessThanOrEqual(flowCtrl.maxZoomValue)
  })

  it("resets view to origin", () => {
    const flowCtrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    const toolbarCtrl = app.getControllerForElementAndIdentifier(toolbarEl, "flow-toolbar")
    flowCtrl.setViewport({ x: 500, y: 500, zoom: 2 })
    toolbarCtrl.resetView()
    expect(flowCtrl.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it("DOM setup is correct", () => {
    expect(toolbarEl.dataset.controller).toContain("flow-toolbar")
    expect(toolbarEl.querySelector('[data-flow-toolbar-target="zoomLevel"]')).toBeTruthy()
  })
})
