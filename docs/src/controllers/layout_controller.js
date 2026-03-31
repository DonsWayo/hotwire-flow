import { Controller } from "@hotwired/stimulus"
import { autoLayout } from "../lib/auto-layout.js"
import { getFlowController } from "../lib/utils.js"

// Layout controller — auto-layout buttons for vertical/horizontal arrangement.
export default class extends Controller {
  static outlets = ["flow"]

  static values = {
    direction: { type: String, default: "TB" },
    nodeSpacing: { type: Number, default: 80 },
    rankSpacing: { type: Number, default: 150 }
  }

  connect() {
    this.element.classList.add("hf-layout-controls")
  }

  layoutVertical()   { this._applyLayout("TB") }
  layoutHorizontal() { this._applyLayout("LR") }

  _applyLayout(direction) {
    const flow = this._getFlow()
    if (!flow) return

    const nodes = flow.getNodes()
    const edges = flow.getEdges()

    if (nodes.length === 0) return

    // Get current node dimensions from DOM
    const nodeDims = new Map()
    if (flow.hasNodesTarget) {
      flow.nodesTarget.querySelectorAll("[data-flow-node]").forEach(el => {
        nodeDims.set(el.dataset.flowNode, {
          width: el.offsetWidth || 150,
          height: el.offsetHeight || 60
        })
      })
    }

    const avgWidth = nodeDims.size > 0
      ? Array.from(nodeDims.values()).reduce((s, d) => s + d.width, 0) / nodeDims.size
      : 150
    const avgHeight = nodeDims.size > 0
      ? Array.from(nodeDims.values()).reduce((s, d) => s + d.height, 0) / nodeDims.size
      : 60

    const positions = autoLayout(nodes, edges, {
      direction,
      nodeSpacing: this.nodeSpacingValue,
      rankSpacing: this.rankSpacingValue,
      nodeWidth: avgWidth,
      nodeHeight: avgHeight
    })

    // Animate nodes to new positions
    if (flow.hasNodesTarget) {
      positions.forEach((pos, id) => {
        const el = flow.nodesTarget.querySelector(`[data-flow-node="${id}"]`)
        if (el) {
          el.style.transition = "left 0.4s ease, top 0.4s ease"
          el.style.left = `${pos.x}px`
          el.style.top = `${pos.y}px`

          // Remove transition after animation
          setTimeout(() => {
            el.style.transition = ""
          }, 450)

          // Update flow controller's internal state
          flow._emit("nodemove", { nodeId: id, x: pos.x, y: pos.y })
        }
      })
    }

    // Fit view after layout
    setTimeout(() => flow.fitView(60), 500)

    this._emit("layout", { direction, positions: Object.fromEntries(positions) })
  }

  _getFlow() { return getFlowController(this.application) }

  _emit(name, detail) {
    document.dispatchEvent(new CustomEvent(`hotwire-flow:${name}`, { detail, bubbles: true }))
  }
}
