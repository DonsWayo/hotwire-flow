import { Controller } from "@hotwired/stimulus"

// Temporary connection line shown while dragging between handles.
// Listens for custom events instead of using outlets.
export default class extends Controller {
  connect() {
    this.sourcePosition = null
    this.targetPosition = null
    this.element.classList.add("hf-connection-line")

    this._onStart = (e) => {
      this.sourcePosition = e.detail.position
      this.targetPosition = { ...e.detail.position }
      this.element.style.display = "block"
    }
    this._onMove = (e) => {
      this.sourcePosition = this.sourcePosition || { x: e.detail.x, y: e.detail.y }
      this.targetPosition = { x: e.detail.x, y: e.detail.y }
      this._render()
    }
    this._onEnd = () => {
      this.element.style.display = "none"
      this.element.removeAttribute("d")
      this.sourcePosition = null
      this.targetPosition = null
    }

    document.addEventListener("hotwire-flow:connectionstart", this._onStart)
    document.addEventListener("hotwire-flow:connectionmove", this._onMove)
    document.addEventListener("hotwire-flow:connectionend", this._onEnd)
    document.addEventListener("hotwire-flow:connectioncancel", this._onEnd)
  }

  disconnect() {
    document.removeEventListener("hotwire-flow:connectionstart", this._onStart)
    document.removeEventListener("hotwire-flow:connectionmove", this._onMove)
    document.removeEventListener("hotwire-flow:connectionend", this._onEnd)
    document.removeEventListener("hotwire-flow:connectioncancel", this._onEnd)
  }

  _render() {
    if (!this.sourcePosition || !this.targetPosition) return
    const { x: sx, y: sy } = this.sourcePosition
    const { x: tx, y: ty } = this.targetPosition
    const curv = Math.min(Math.hypot(tx - sx, ty - sy) * 0.5, 100)
    this.element.setAttribute("d", `M ${sx} ${sy} C ${sx + curv} ${sy}, ${tx - curv} ${ty}, ${tx} ${ty}`)
  }
}
