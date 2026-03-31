import { Controller } from "@hotwired/stimulus"

// Toolbar — zoom controls, fit view, zoom percentage.
export default class extends Controller {
  static outlets = ["flow"]
  static targets = ["zoomLevel"]

  connect() {
    this._onChange = () => this._updateZoomLevel()
    document.addEventListener("hotwire-flow:viewportchange", this._onChange)
    this._updateZoomLevel()
  }

  disconnect() {
    document.removeEventListener("hotwire-flow:viewportchange", this._onChange)
  }

  zoomIn()   { this.flowOutlet?.zoomIn() }
  zoomOut()  { this.flowOutlet?.zoomOut() }
  fitView()  { this.flowOutlet?.fitView() }
  resetView(){ this.flowOutlet?.setViewport({ x: 0, y: 0, zoom: 1 }) }

  _updateZoomLevel() {
    if (this.hasZoomLevelTarget && this.hasFlowOutlet) {
      this.zoomLevelTarget.textContent = `${this.flowOutlet.zoomPercentage}%`
    }
  }
}
