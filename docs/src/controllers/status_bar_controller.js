import { Controller } from "@hotwired/stimulus"
import { getFlowController } from "../lib/utils.js"

// Status bar — bottom bar showing zoom, node count, mouse position.
export default class extends Controller {
  static targets = ["zoom", "position", "nodes", "edges", "selection"]

  connect() {
    this._onMove = (e) => this._updatePosition(e)
    this._onViewport = () => this._updateZoom()
    this.element.addEventListener("mousemove", this._onMove)
    this._onNodeMove = () => this._updateCounts()
    document.addEventListener("hotwire-flow:viewportchange", this._onViewport)
    document.addEventListener("hotwire-flow:nodemove", this._onNodeMove)

    // Use DOM fallback immediately, then update with flow controller if available
    this._updateCountsDOM()
    this._updateZoom()

    // Retry with flow controller after delay
    setTimeout(() => {
      const flow = this._getFlow()
      if (flow) {
        this._updateZoom()
        this._updateCounts()
      }
    }, 500)

    // Keep retrying for viewport changes
    this._pollInterval = setInterval(() => this._updateCountsDOM(), 2000)
  }

  disconnect() {
    this.element.removeEventListener("mousemove", this._onMove)
    document.removeEventListener("hotwire-flow:viewportchange", this._onViewport)
    document.removeEventListener("hotwire-flow:nodemove", this._onNodeMove)
    if (this._pollInterval) clearInterval(this._pollInterval)
  }

  _getFlow() { return getFlowController(this.application) }

  _retryUpdate(attempt = 0) {
    const flow = this._getFlow()
    if (flow) {
      this._updateZoom()
      this._updateCounts()
    } else if (attempt < 10) {
      setTimeout(() => this._retryUpdate(attempt + 1), 200)
    } else {
      // DOM fallback
      this._updateCountsDOM()
    }
  }

  _updatePosition(event) {
    if (!this.hasPositionTarget) return
    const flow = this._getFlow()
    if (!flow) return
    const pos = flow.screenToFlow(event.clientX, event.clientY)
    this.positionTarget.textContent = `${Math.round(pos.x)}, ${Math.round(pos.y)}`
  }

  _updateZoom() {
    if (!this.hasZoomTarget) return
    const flow = this._getFlow()
    if (!flow) return
    this.zoomTarget.textContent = `${flow.zoomPercentage}%`
  }

  _updateCounts() {
    const flow = this._getFlow()
    if (flow) {
      if (this.hasNodesTarget) this.nodesTarget.textContent = `${flow.getNodes().length} nodes`
      if (this.hasEdgesTarget) this.edgesTarget.textContent = `${flow.getEdges().length} edges`
    } else {
      this._updateCountsDOM()
    }
  }

  _updateCountsDOM() {
    if (this.hasNodesTarget) {
      this.nodesTarget.textContent = `${document.querySelectorAll("[data-flow-node]").length} nodes`
    }
    if (this.hasEdgesTarget) {
      this.edgesTarget.textContent = `${document.querySelectorAll("path.hf-edge").length} edges`
    }
  }
}
