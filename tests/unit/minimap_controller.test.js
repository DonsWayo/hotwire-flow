import { describe, it, expect, beforeEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import MinimapController from "../../src/controllers/minimap_controller.js"
import FlowController from "../../src/controllers/flow_controller.js"

function setupDOM() {
  document.body.innerHTML = `
    <div data-controller="flow" id="canvas" class="hf-canvas"
         data-flow-fit-view-on-init-value="false">
      <div data-flow-target="pane" class="hf-pane">
        <div data-flow-target="nodes" class="hf-nodes">
          <div data-flow-node="n1" style="left:100px;top:100px;width:150px;height:80px;position:absolute">N1</div>
          <div data-flow-node="n2" style="left:400px;top:300px;width:150px;height:80px;position:absolute">N2</div>
        </div>
      </div>
      <div data-flow-target="selectionBox" class="hf-selection-box"></div>
      <div data-controller="flow-minimap"
           data-flow-minimap-flow-outlet="#canvas"
           style="width:200px;height:150px"></div>
    </div>
  `
}

function startApp() {
  const app = Application.start()
  app.register("flow", FlowController)
  app.register("flow-minimap", MinimapController)
  return app
}

describe("MinimapController", () => {
  let app, minimapEl

  beforeEach(() => {
    setupDOM()
    app = startApp()
    minimapEl = document.querySelector('[data-controller="flow-minimap"]')
  })

  it("renders SVG with nodes", async () => {
    await vi.waitFor(() => {
      expect(minimapEl.innerHTML).toContain("<svg")
      expect(minimapEl.innerHTML).toContain("<rect")
    })
  })

  it("has hf-minimap class", async () => {
    await vi.waitFor(() => app.getControllerForElementAndIdentifier(minimapEl, "flow-minimap"))
    expect(minimapEl.classList.contains("hf-minimap")).toBe(true)
  })

  it("renders viewport rectangle", async () => {
    await vi.waitFor(() => {
      const html = minimapEl.innerHTML
      // Should have 2 node rects + 1 viewport rect = 3 rects
      const rectCount = (html.match(/<rect/g) || []).length
      expect(rectCount).toBeGreaterThanOrEqual(3)
    })
  })

  it("re-renders on viewport change", async () => {
    await vi.waitFor(() => app.getControllerForElementAndIdentifier(minimapEl, "flow-minimap"))

    const before = minimapEl.innerHTML

    const canvas = document.getElementById("canvas")
    const flowCtrl = app.getControllerForElementAndIdentifier(canvas, "flow")
    flowCtrl.setViewport({ x: 200, y: 200, zoom: 2 })

    // Minimap should update with different viewport rect
    await vi.waitFor(() => {
      const after = minimapEl.innerHTML
      expect(after).not.toBe(before)
    })
  })
})
