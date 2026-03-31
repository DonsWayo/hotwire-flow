import { Controller } from "@hotwired/stimulus"

// Panel — positioned container for UI controls (like React Flow's <Panel />).
export default class extends Controller {
  static values = {
    position: { type: String, default: "top-left" }
  }

  connect() {
    this.element.classList.add("hf-panel")
    this.element.style.position = "absolute"
    this.element.style.zIndex = "100"
    this._applyPosition()
  }

  _applyPosition() {
    const pos = this.positionValue
    const positions = {
      "top-left":     { top: "16px", left: "16px" },
      "top-right":    { top: "16px", right: "16px" },
      "top-center":   { top: "16px", left: "50%", transform: "translateX(-50%)" },
      "bottom-left":  { bottom: "16px", left: "16px" },
      "bottom-right": { bottom: "16px", right: "16px" },
      "bottom-center":{ bottom: "16px", left: "50%", transform: "translateX(-50%)" }
    }
    Object.assign(this.element.style, positions[pos] || positions["top-left"])
  }
}
