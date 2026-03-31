import { Controller } from "@hotwired/stimulus"

// Background pattern controller — dots, grid, lines, or none.
// Tracks viewport to keep pattern aligned with the pan/zoom.
export default class extends Controller {
  static outlets = ["flow"]

  static values = {
    variant: { type: String, default: "dots" },
    gap: { type: Number, default: 20 },
    color: { type: String, default: "#cbd5e1" },
    size: { type: Number, default: 1 }
  }

  connect() {
    this._render()
    this._onViewport = () => this._updateOffset()
    document.addEventListener("hotwire-flow:viewportchange", this._onViewport)
  }

  disconnect() {
    document.removeEventListener("hotwire-flow:viewportchange", this._onViewport)
  }

  _render() {
    const v = this.variantValue, g = this.gapValue, c = this.colorValue, s = this.sizeValue
    this.element.style.backgroundImage = "none"
    if (v === "dots") {
      this.element.style.backgroundImage = `radial-gradient(circle, ${c} ${s}px, transparent ${s}px)`
    } else if (v === "grid") {
      this.element.style.backgroundImage = `linear-gradient(to right, ${c} ${s}px, transparent ${s}px), linear-gradient(to bottom, ${c} ${s}px, transparent ${s}px)`
    } else if (v === "lines") {
      this.element.style.backgroundImage = `linear-gradient(to right, ${c} ${s}px, transparent ${s}px)`
    }
    this._updateOffset()
  }

  _updateOffset() {
    const flow = this.flowOutlet
    if (!flow) return
    const z = flow.viewport.zoom
    const gap = this.gapValue * z
    this.element.style.backgroundPosition = `${flow.viewport.x % gap}px ${flow.viewport.y % gap}px`
    this.element.style.backgroundSize = `${gap}px ${gap}px`
  }

  changeVariant(event) {
    this.variantValue = event.currentTarget.dataset.variant
    this._render()
  }
}
