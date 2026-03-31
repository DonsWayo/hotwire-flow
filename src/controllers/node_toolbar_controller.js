import { Controller } from "@hotwired/stimulus"

// Node toolbar — floating toolbar above selected nodes.
export default class extends Controller {
  static values = {
    nodeId: { type: String, default: "" },
    isVisible: { type: Boolean, default: false },
    position: { type: String, default: "top" },
    offset: { type: Number, default: 10 }
  }

  connect() {
    this.element.classList.add("hf-node-toolbar")
    this.element.style.cssText = `
      position: absolute;
      display: ${this.isVisibleValue ? "flex" : "none"};
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 4px;
      gap: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 100;
      pointer-events: auto;
    `
    this._onSelect = () => this._updateVisibility()
    document.addEventListener("hotwire-flow:nodeselect", this._onSelect)
    document.addEventListener("hotwire-flow:nodedeselect", this._onSelect)
    this._updatePosition()
  }

  disconnect() {
    document.removeEventListener("hotwire-flow:nodeselect", this._onSelect)
    document.removeEventListener("hotwire-flow:nodedeselect", this._onSelect)
  }

  _updateVisibility() {
    const nodeEl = this.element.closest("[data-flow-node]")
    if (!nodeEl) return
    const isVisible = nodeEl.classList.contains("selected") || this.isVisibleValue
    this.element.style.display = isVisible ? "flex" : "none"
    if (isVisible) this._updatePosition()
  }

  _updatePosition() {
    const nodeEl = this.element.closest("[data-flow-node]")
    if (!nodeEl) return
    const pos = this.positionValue
    if (pos === "top") {
      this.element.style.bottom = "100%"
      this.element.style.left = "50%"
      this.element.style.transform = "translateX(-50%)"
      this.element.style.marginBottom = `${this.offsetValue}px`
    } else if (pos === "bottom") {
      this.element.style.top = "100%"
      this.element.style.left = "50%"
      this.element.style.transform = "translateX(-50%)"
      this.element.style.marginTop = `${this.offsetValue}px`
    }
  }

  show() { this.element.style.display = "flex"; this._updatePosition() }
  hide() { this.element.style.display = "none" }
}
