import { Controller } from "@hotwired/stimulus"

// Node resizer — drag handles to resize a node.
export default class extends Controller {
  static values = {
    nodeId: { type: String, default: "" },
    minWidth: { type: Number, default: 50 },
    minHeight: { type: Number, default: 30 },
    maxWidth: { type: Number, default: 2000 },
    maxHeight: { type: Number, default: 2000 },
    keepAspectRatio: { type: Boolean, default: false }
  }

  connect() {
    this.element.classList.add("hf-node-resizer")
    this._createHandles()
  }

  _createHandles() {
    const positions = ["se", "sw", "ne", "nw", "n", "s", "e", "w"]
    positions.forEach(pos => {
      const handle = document.createElement("div")
      handle.className = `hf-resize-handle hf-resize-handle--${pos}`
      handle.dataset.resizePosition = pos
      handle.style.cssText = this._getHandleStyle(pos)
      handle.addEventListener("pointerdown", (e) => this._startResize(e, pos))
      this.element.appendChild(handle)
    })
  }

  _getHandleStyle(pos) {
    const base = "position:absolute;width:10px;height:10px;z-index:20;"
    const styles = {
      se: base + "right:-5px;bottom:-5px;cursor:se-resize;",
      sw: base + "left:-5px;bottom:-5px;cursor:sw-resize;",
      ne: base + "right:-5px;top:-5px;cursor:ne-resize;",
      nw: base + "left:-5px;top:-5px;cursor:nw-resize;",
      n: base + "top:-5px;left:50%;transform:translateX(-50%);cursor:n-resize;width:30px;height:5px;",
      s: base + "bottom:-5px;left:50%;transform:translateX(-50%);cursor:s-resize;width:30px;height:5px;",
      e: base + "right:-5px;top:50%;transform:translateY(-50%);cursor:e-resize;width:5px;height:30px;",
      w: base + "left:-5px;top:50%;transform:translateY(-50%);cursor:w-resize;width:5px;height:30px;"
    }
    return styles[pos] || base
  }

  _startResize(event, pos) {
    event.stopPropagation(); event.preventDefault()
    const nodeEl = this.element.closest("[data-flow-node]")
    if (!nodeEl) return

    const startX = event.clientX, startY = event.clientY
    const startW = nodeEl.offsetWidth, startH = nodeEl.offsetHeight
    const startLeft = parseFloat(nodeEl.style.left) || 0
    const startTop = parseFloat(nodeEl.style.top) || 0
    const aspect = startW / startH

    const onMove = (e) => {
      let dx = e.clientX - startX, dy = e.clientY - startY
      let newW = startW, newH = startH, newLeft = startLeft, newTop = startTop

      if (pos.includes("e")) newW = Math.max(this.minWidthValue, Math.min(this.maxWidthValue, startW + dx))
      if (pos.includes("w")) { newW = Math.max(this.minWidthValue, Math.min(this.maxWidthValue, startW - dx)); newLeft = startLeft + startW - newW }
      if (pos.includes("s")) newH = Math.max(this.minHeightValue, Math.min(this.maxHeightValue, startH + dy))
      if (pos.includes("n")) { newH = Math.max(this.minHeightValue, Math.min(this.maxHeightValue, startH - dy)); newTop = startTop + startH - newH }

      if (this.keepAspectRatioValue) {
        if (pos === "e" || pos === "w") newH = newW / aspect
        else if (pos === "n" || pos === "s") newW = newH * aspect
        else { newH = newW / aspect }
      }

      nodeEl.style.width = `${newW}px`; nodeEl.style.height = `${newH}px`
      nodeEl.style.left = `${newLeft}px`; nodeEl.style.top = `${newTop}px`

      this.dispatch("resize", { detail: { width: newW, height: newH, x: newLeft, y: newTop } })
      document.dispatchEvent(new CustomEvent("hotwire-flow:noderesize", { detail: { width: newW, height: newH, x: newLeft, y: newTop }, bubbles: true }))
    }

    const onUp = () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      this.dispatch("resizeend", { detail: { width: nodeEl.offsetWidth, height: nodeEl.offsetHeight } })
      document.dispatchEvent(new CustomEvent("hotwire-flow:noderesizeend", { detail: { width: nodeEl.offsetWidth, height: nodeEl.offsetHeight }, bubbles: true }))
    }

    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    this.dispatch("resizestart")
    document.dispatchEvent(new CustomEvent("hotwire-flow:noderesizestart", { bubbles: true }))
  }
}
