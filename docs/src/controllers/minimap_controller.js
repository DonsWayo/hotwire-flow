import { Controller } from "@hotwired/stimulus"

// Minimap overview of the graph.
export default class extends Controller {
  static outlets = ["flow"]

  static values = {
    nodeColor: { type: String, default: "#e2e8f0" },
    nodeStrokeColor: { type: String, default: "#94a3b8" },
    viewportColor: { type: String, default: "rgba(59, 130, 246, 0.1)" },
    viewportStroke: { type: String, default: "#3b82f6" },
    pannable: { type: Boolean, default: true }
  }

  connect() {
    this.element.classList.add("hf-minimap")
    this._render()

    this._onChange = () => this._render()
    document.addEventListener("hotwire-flow:viewportchange", this._onChange)
    document.addEventListener("hotwire-flow:nodemove", this._onChange)

    if (this.pannableValue) {
      this._onPanDown = (e) => this._handlePan(e)
      this.element.addEventListener("pointerdown", this._onPanDown)
    }
  }

  disconnect() {
    document.removeEventListener("hotwire-flow:viewportchange", this._onChange)
    document.removeEventListener("hotwire-flow:nodemove", this._onChange)
    if (this._onPanDown) this.element.removeEventListener("pointerdown", this._onPanDown)
  }

  _render() {
    const flow = this.flowOutlet
    if (!flow?.hasNodesTarget) return

    const nodes = flow.nodesTarget.querySelectorAll("[data-flow-node]")
    if (nodes.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => {
      const x = parseFloat(n.style.left) || 0, y = parseFloat(n.style.top) || 0
      minX = Math.min(minX, x); minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + n.offsetWidth); maxY = Math.max(maxY, y + n.offsetHeight)
    })

    const pad = 50
    minX -= pad; minY -= pad; maxX += pad; maxY += pad
    const cw = maxX - minX, ch = maxY - minY
    const mmW = this.element.offsetWidth || 200, mmH = this.element.offsetHeight || 150
    const scale = Math.min(mmW / cw, mmH / ch)

    this.element.innerHTML = "" // Clear existing content

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", `0 0 ${mmW} ${mmH}`)

    nodes.forEach(n => {
      const x = ((parseFloat(n.style.left) || 0) - minX) * scale
      const y = ((parseFloat(n.style.top) || 0) - minY) * scale
      const w = n.offsetWidth * scale, h = n.offsetHeight * scale
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      rect.setAttribute("x", String(x))
      rect.setAttribute("y", String(y))
      rect.setAttribute("width", String(Math.max(w, 3)))
      rect.setAttribute("height", String(Math.max(h, 3)))
      rect.setAttribute("fill", this.nodeColorValue)
      rect.setAttribute("stroke", this.nodeStrokeColorValue)
      rect.setAttribute("stroke-width", "1")
      rect.setAttribute("rx", "2")
      svg.appendChild(rect)
    })

    const rect = flow.element.getBoundingClientRect()
    const vpx = ((-flow.viewport.x / flow.viewport.zoom) - minX) * scale
    const vpy = ((-flow.viewport.y / flow.viewport.zoom) - minY) * scale
    const vpw = (rect.width / flow.viewport.zoom) * scale
    const vph = (rect.height / flow.viewport.zoom) * scale

    const vpRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    vpRect.setAttribute("x", String(vpx))
    vpRect.setAttribute("y", String(vpy))
    vpRect.setAttribute("width", String(vpw))
    vpRect.setAttribute("height", String(vph))
    vpRect.setAttribute("fill", this.viewportColorValue)
    vpRect.setAttribute("stroke", this.viewportStrokeValue)
    vpRect.setAttribute("stroke-width", "1")
    vpRect.setAttribute("rx", "2")
    svg.appendChild(vpRect)

    this.element.appendChild(svg)
  }

  _handlePan(event) {
    event.stopPropagation()
    const flow = this.flowOutlet
    if (!flow) return

    const move = (e) => {
      const rect = this.element.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height

      const nodes = flow.nodesTarget.querySelectorAll("[data-flow-node]")
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
      nodes.forEach(n => {
        const x = parseFloat(n.style.left) || 0, y = parseFloat(n.style.top) || 0
        mnX = Math.min(mnX, x); mnY = Math.min(mnY, y)
        mxX = Math.max(mxX, x + n.offsetWidth); mxY = Math.max(mxY, y + n.offsetHeight)
      })
      mnX -= 50; mnY -= 50; mxX += 50; mxY += 50

      const cw = mxX - mnX, ch = mxY - mnY
      const tx = mnX + px * cw, ty = mnY + py * ch
      const elRect = flow.element.getBoundingClientRect()
      flow.viewport.x = -tx * flow.viewport.zoom + elRect.width / 2
      flow.viewport.y = -ty * flow.viewport.zoom + elRect.height / 2
      flow._applyTransform()
      this._render()
    }

    move(event)
    const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up) }
    document.addEventListener("pointermove", move)
    document.addEventListener("pointerup", up)
  }
}
