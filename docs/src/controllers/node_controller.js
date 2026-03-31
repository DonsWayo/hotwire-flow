import { Controller } from "@hotwired/stimulus"

// Node controller — drag, select, resize, hidden, deletable, zIndex, dragHandle.
export default class extends Controller {
  static values = {
    id: String,
    type: { type: String, default: "default" },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    draggable: { type: Boolean, default: true },
    selectable: { type: Boolean, default: true },
    connectable: { type: Boolean, default: true },
    deletable: { type: Boolean, default: true },
    selected: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    zIndex: { type: Number, default: 0 },
    dragHandle: { type: String, default: "" },
    sourcePosition: { type: String, default: "right" },
    targetPosition: { type: String, default: "left" },
    parentId: { type: String, default: "" },
    extent: { type: Array, default: [] },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  }

  static outlets = ["flow"]

  connect() {
    this.element.style.left = `${this.xValue}px`
    this.element.style.top = `${this.yValue}px`
    this.element.dataset.flowNode = this.idValue
    this.element.dataset.nodeType = this.typeValue

    if (this.hiddenValue) this.element.style.display = "none"
    if (this.zIndexValue) this.element.style.zIndex = this.zIndexValue
    if (this.selectedValue) this.select()
  }

  // --- Drag ---
  pointerDown(event) {
    if (!this.draggableValue || event.button !== 0) return

    // Check dragHandle restriction
    if (this.dragHandleValue) {
      const handle = event.target.closest(this.dragHandleValue)
      if (!handle && !event.target.closest("[data-flow-node]")) return
    }

    event.stopPropagation()

    const flow = this.flowOutlet
    if (!flow) return

    if (flow.selectedNodes.has(this.idValue)) {
      flow.selectedNodes.forEach(id => {
        if (id === this.idValue) return
        const el = flow.hasNodesTarget ? flow.nodesTarget.querySelector(`[data-flow-node="${id}"]`) : null
        if (!el) return
        el.dataset.dragOffsetX = (parseFloat(el.style.left) || 0) - this.xValue
        el.dataset.dragOffsetY = (parseFloat(el.style.top) || 0) - this.yValue
      })
    }

    this.element.classList.add("dragging")
    flow.startNodeDrag(this.idValue, event)
    this.element.setPointerCapture(event.pointerId)

    this._moveHandler = (e) => this._onMove(e)
    this._upHandler = (e) => this._onUp(e)
    this.element.addEventListener("pointermove", this._moveHandler)
    this.element.addEventListener("pointerup", this._upHandler)
  }

  _onMove(event) { this.flowOutlet?.updateNodeDrag(event) }

  _onUp() {
    this.element.classList.remove("dragging")
    this.flowOutlet?.endNodeDrag()
    this.element.removeEventListener("pointermove", this._moveHandler)
    this.element.removeEventListener("pointerup", this._upHandler)
  }

  // --- Click ---
  click(event) {
    event.stopPropagation()
    const flow = this.flowOutlet
    if (!flow) return

    if (event.shiftKey) {
      flow.selectedNodes.has(this.idValue) ? flow.deselectNode(this.idValue) : flow.selectNode(this.idValue)
    } else {
      flow.clearSelection()
      flow.selectNode(this.idValue)
    }
  }

  dblclick(event) {
    event.stopPropagation()
    this._dispatchNodeEvent("nodedblclick", { nodeId: this.idValue })
  }

  // --- Selection ---
  select()   { if (this.selectableValue) { this.element.classList.add("selected"); this.selectedValue = true } }
  deselect() { this.element.classList.remove("selected"); this.selectedValue = false }

  // --- Position ---
  moveTo(x, y) {
    this.xValue = x; this.yValue = y
    this.element.style.left = `${x}px`
    this.element.style.top = `${y}px`
  }

  // --- Properties ---
  hide() { this.hiddenValue = true; this.element.style.display = "none" }
  show() { this.hiddenValue = false; this.element.style.display = "" }

  setZIndex(z) {
    this.zIndexValue = z
    this.element.style.zIndex = z
  }

  get position() { return { x: this.xValue, y: this.yValue } }
  get center()   { return { x: this.xValue + this.element.offsetWidth / 2, y: this.yValue + this.element.offsetHeight / 2 } }
  get bounds()   { return { x: this.xValue, y: this.yValue, width: this.element.offsetWidth, height: this.element.offsetHeight } }

  _dispatchNodeEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(`hotwire-flow:${name}`, { detail, bubbles: true }))
  }

  disconnect() {
    this.element.removeEventListener("pointermove", this._moveHandler)
    this.element.removeEventListener("pointerup", this._upHandler)
  }
}
