import { Controller } from "@hotwired/stimulus"

// Edge toolbar — floating toolbar when an edge is selected.
export default class extends Controller {
  static values = {
    edgeId: { type: String, default: "" }
  }

  connect() {
    this.element.classList.add("hf-edge-toolbar")
    this.element.style.cssText = `
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 4px;
      gap: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 100;
    `
    this._onEdgeClick = (e) => this._handleEdgeClick(e)
    document.addEventListener("hotwire-flow:edgeclick", this._onEdgeClick)
  }

  disconnect() {
    document.removeEventListener("hotwire-flow:edgeclick", this._onEdgeClick)
  }

  _handleEdgeClick(event) {
    const edgeId = event.detail.edgeId
    this.edgeIdValue = edgeId
    this._positionOnEdge(edgeId)
    this.element.style.display = "flex"
  }

  _positionOnEdge(edgeId) {
    const edgeEl = document.querySelector(`[data-edge="${edgeId}"]`)
    if (!edgeEl) return
    const svg = edgeEl.closest("svg")
    if (!svg) return

    // Get edge midpoint from path
    const pathLength = edgeEl.getTotalLength?.() || 0
    if (pathLength > 0) {
      const mid = edgeEl.getPointAtLength(pathLength / 2)
      const svgRect = svg.getBoundingClientRect()
      this.element.style.left = `${mid.x + svgRect.left}px`
      this.element.style.top = `${mid.y + svgRect.top - 40}px`
    }
  }

  deleteEdge() {
    if (this.edgeIdValue) {
      document.dispatchEvent(new CustomEvent("hotwire-flow:edgedelete", { detail: { edgeId: this.edgeIdValue } }))
      document.querySelector(`[data-edge="${this.edgeIdValue}"]`)?.remove()
      document.querySelector(`[data-edge-interaction="${this.edgeIdValue}"]`)?.remove()
    }
    this.element.style.display = "none"
  }

  hide() { this.element.style.display = "none" }
}
