import { Controller } from "@hotwired/stimulus"

// Connection handles — the circles on nodes you drag from/to.
export default class extends Controller {
  static values = {
    id: String,
    nodeId: String,
    type: { type: String, default: "source" },
    position: { type: String, default: "right" }
  }

  static outlets = ["flow"]

  connect() {
    this.element.dataset.handle = this.idValue
    this.element.dataset.handleNode = this.nodeIdValue
    this.element.dataset.handlePosition = this.positionValue
  }

  pointerDown(event) {
    event.stopPropagation()
    event.preventDefault()
    const flow = this.flowOutlet
    if (!flow) return

    flow.startConnecting(this.idValue, this.nodeIdValue, this.getAbsolutePosition())

    this._moveHandler = (e) => this._onMove(e)
    this._upHandler = (e) => this._onUp(e)
    document.addEventListener("pointermove", this._moveHandler)
    document.addEventListener("pointerup", this._upHandler)
  }

  _onMove(event) {
    const flow = this.flowOutlet
    if (!flow) return
    const rect = flow.element.getBoundingClientRect()
    const x = (event.clientX - rect.left - flow.viewport.x) / flow.viewport.zoom
    const y = (event.clientY - rect.top - flow.viewport.y) / flow.viewport.zoom
    flow.updateConnecting(x, y)
  }

  _onUp(event) {
    const flow = this.flowOutlet
    if (!flow) return

    const target = event.target.closest("[data-handle]")
    if (target && target !== this.element) {
      flow.endConnecting(target.dataset.handle, target.dataset.handleNode)
    } else {
      flow.endConnecting()
    }

    document.removeEventListener("pointermove", this._moveHandler)
    document.removeEventListener("pointerup", this._upHandler)
  }

  getAbsolutePosition() {
    const nodeEl = this.element.closest("[data-flow-node]")
    if (!nodeEl) return { x: 0, y: 0 }

    const nx = parseFloat(nodeEl.style.left) || 0
    const ny = parseFloat(nodeEl.style.top) || 0
    const nw = nodeEl.offsetWidth
    const nh = nodeEl.offsetHeight

    switch (this.positionValue) {
      case "top":    return { x: nx + nw / 2, y: ny }
      case "bottom": return { x: nx + nw / 2, y: ny + nh }
      case "left":   return { x: nx, y: ny + nh / 2 }
      default:       return { x: nx + nw, y: ny + nh / 2 }
    }
  }

  markConnected()    { this.element.classList.add("connected") }
  markDisconnected() { this.element.classList.remove("connected") }

  disconnect() {
    document.removeEventListener("pointermove", this._moveHandler)
    document.removeEventListener("pointerup", this._upHandler)
  }
}
