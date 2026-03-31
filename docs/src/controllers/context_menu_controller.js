import { Controller } from "@hotwired/stimulus"

// Right-click context menu.
export default class extends Controller {
  static outlets = ["flow"]
  static targets = ["menu"]

  connect() {
    this._onCtx = (e) => this._show(e)
    this._onClickOutside = (e) => this._hide(e)

    if (this.hasFlowOutlet) {
      this.flowOutlet.element.addEventListener("hotwire-flow:contextmenu", this._onCtx)
    }
    document.addEventListener("click", this._onClickOutside)
  }

  disconnect() {
    document.removeEventListener("click", this._onClickOutside)
    if (this.hasFlowOutlet) {
      this.flowOutlet.element.removeEventListener("hotwire-flow:contextmenu", this._onCtx)
    }
  }

  _show(event) {
    event.preventDefault()
    event.stopPropagation()
    const { x, y, nodeId, flowPosition } = event.detail
    this.currentNodeId = nodeId
    this.currentFlowPosition = flowPosition
    this.element.style.display = "block"
    this.element.style.left = `${x}px`
    this.element.style.top = `${y}px`
  }

  _hide(event) {
    if (this.element.style.display === "none") return
    if (event && this.element.contains(event.target)) return
    this.element.style.display = "none"
  }

  deleteNode() {
    if (this.currentNodeId) this.element.dispatchEvent(new CustomEvent("hotwire-flow:delete", { detail: { nodeId: this.currentNodeId }, bubbles: true }))
    this._hide()
  }

  duplicateNode() {
    if (this.currentNodeId) this.element.dispatchEvent(new CustomEvent("hotwire-flow:duplicate", { detail: { nodeId: this.currentNodeId }, bubbles: true }))
    this._hide()
  }

  addNodeHere() {
    this.element.dispatchEvent(new CustomEvent("hotwire-flow:addnode", { detail: { x: this.currentFlowPosition?.x || 0, y: this.currentFlowPosition?.y || 0 }, bubbles: true }))
    this._hide()
  }
}
