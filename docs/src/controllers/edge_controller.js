import { Controller } from "@hotwired/stimulus"

// SVG edge rendering — professional-quality bezier, smoothstep, step, straight.
// Ported from React Flow's getBezierPath and getSmoothStepPath algorithms.
export default class extends Controller {
  static values = {
    id: String,
    source: String,
    sourceHandle: { type: String, default: "right" },
    target: String,
    targetHandle: { type: String, default: "left" },
    type: { type: String, default: "bezier" },
    animated: { type: Boolean, default: false },
    label: { type: String, default: "" },
    labelStyle: { type: Object, default: {} },
    labelShowBg: { type: Boolean, default: true },
    labelBgPadding: { type: Array, default: [5, 5] },
    labelBgBorderRadius: { type: Number, default: 4 },
    hidden: { type: Boolean, default: false },
    deletable: { type: Boolean, default: true },
    selectable: { type: Boolean, default: true },
    interactionWidth: { type: Number, default: 20 },
    reconnectable: { type: Boolean, default: true },
    markerStart: { type: String, default: "" },
    markerEnd: { type: String, default: "arrow" },
    markerColor: { type: String, default: "#94a3b8" },
    style: { type: Object, default: {} },
    curvature: { type: Number, default: 0.25 },
    borderRadius: { type: Number, default: 5 },
    offset: { type: Number, default: 20 }
  }

  connect() {
    this.element.dataset.edge = this.idValue
    this.element.classList.add("hf-edge")
    if (this.animatedValue) this.element.classList.add("animated")
    if (this.hiddenValue) this.element.style.display = "none"
    if (this.styleValue && typeof this.styleValue === "object") Object.assign(this.element.style, this.styleValue)

    this._interactionPath = null
    this._labelEl = null
    this._sourceHandle = null
    this._targetHandle = null
    this._createInteractionPath()
    if (this.reconnectableValue) this._createReconnectHandles()
    if (this.labelValue) this._createLabel()
    this._setupMarkers()

    this._onNodeMove = () => this._updatePath()
    document.addEventListener("hotwire-flow:nodemove", this._onNodeMove)

    this._retryCount = 0
    this._scheduleUpdate()
  }

  disconnect() {
    document.removeEventListener("hotwire-flow:nodemove", this._onNodeMove)
    if (this._retryTimer) clearTimeout(this._retryTimer)
    if (this._interactionPath && this._onInteractionClick) this._interactionPath.removeEventListener("click", this._onInteractionClick)
    this._interactionPath?.remove()
    this._labelEl?.remove()
    if (this._sourceHandle) {
      this._sourceHandle.removeEventListener("pointerdown", this._onSourceDrag)
      this._sourceHandle.remove()
    }
    if (this._targetHandle) {
      this._targetHandle.removeEventListener("pointerdown", this._onTargetDrag)
      this._targetHandle.remove()
    }
  }

  _scheduleUpdate() {
    this._retryCount++
    const delay = Math.min(this._retryCount * 30, 300)
    this._retryTimer = setTimeout(() => this._updatePath(), delay)
  }

  _findNodesContainer() { return this.element.closest("svg")?.parentElement?.querySelector('[data-flow-target="nodes"]') || document.querySelector('[data-flow-target="nodes"]') }

  _updatePath() {
    const container = this._findNodesContainer()
    if (!container) { if (this._retryCount < 10) this._scheduleUpdate(); return }

    const sourceEl = container.querySelector(`[data-flow-node="${this.sourceValue}"]`)
    const targetEl = container.querySelector(`[data-flow-node="${this.targetValue}"]`)
    if (!sourceEl || !targetEl) { if (this._retryCount < 10) this._scheduleUpdate(); return }

    const sp = this._getHandlePosition(sourceEl, this.sourceHandleValue)
    const tp = this._getHandlePosition(targetEl, this.targetHandleValue)
    const { path, labelX, labelY } = this._computePath(sp, tp)

    this.element.setAttribute("d", path)
    if (this._interactionPath) this._interactionPath.setAttribute("d", path)
    if (this._labelEl) {
      this._labelEl.setAttribute("x", String(labelX - 30))
      this._labelEl.setAttribute("y", String(labelY - 12))
    }
    this._updateReconnectHandlePositions()
  }

  _getHandlePosition(el, pos) {
    const x = parseFloat(el.style.left) || 0
    const y = parseFloat(el.style.top) || 0
    const w = el.offsetWidth, h = el.offsetHeight
    switch (pos) {
      case "top":    return { x: x + w / 2, y, position: "top" }
      case "bottom": return { x: x + w / 2, y: y + h, position: "bottom" }
      case "left":   return { x, y: y + h / 2, position: "left" }
      default:       return { x: x + w, y: y + h / 2, position: "right" }
    }
  }

  _computePath(source, target) {
    const s = { x: source.x, y: source.y }
    const t = { x: target.x, y: target.y }
    const sp = source.position
    const tp = target.position

    switch (this.typeValue) {
      case "straight": return this._straightPath(s, t)
      case "step": return this._stepPath(s, t, sp, tp)
      case "smoothstep": return this._smoothStepPath(s, t, sp, tp)
      default: return this._bezierPath(s, t, sp, tp)
    }
  }

  // ═══════════ BEZIER (React Flow's getBezierPath) ═══════════

  _bezierPath(s, t, sp, tp) {
    const curvature = this.curvatureValue
    const dist = Math.hypot(t.x - s.x, t.y - s.y)
    const cpDist = Math.max(dist * curvature, 25)

    // Fan-out: offset control point based on edge index to prevent crossings
    const fanOffset = this._getFanOffset()

    const cp1 = this._getControlPoint(s, sp, cpDist, fanOffset)
    const cp2 = this._getControlPoint(t, tp, cpDist)

    const path = `M ${s.x},${s.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${t.x},${t.y}`
    const labelX = (s.x + t.x) / 2
    const labelY = (s.y + t.y) / 2
    return { path, labelX, labelY }
  }

  _getControlPoint(point, position, distance, fanOffset = 0) {
    switch (position) {
      case "top":    return { x: point.x + fanOffset, y: point.y - distance }
      case "bottom": return { x: point.x + fanOffset, y: point.y + distance }
      case "left":   return { x: point.x - distance, y: point.y + fanOffset }
      default:       return { x: point.x + distance, y: point.y + fanOffset }
    }
  }

  // Calculate fan-out offset based on edge's position among siblings from same source
  _getFanOffset() {
    const container = this._findNodesContainer()
    if (!container) return 0

    // Find all edges from the same source
    const siblings = []
    container.closest("svg")?.parentElement?.querySelectorAll("svg path.hf-edge, svg + div svg path.hf-edge")

    // Try to find sibling edges via the SVG parent
    const allEdges = document.querySelectorAll(`[data-flow-edge-source-value="${this.sourceValue}"]`)
    let myIndex = 0
    let totalCount = 0

    allEdges.forEach((edge, i) => {
      if (edge.dataset.flowEdgeIdValue === this.idValue) myIndex = i
      totalCount++
    })

    if (totalCount <= 1) return 0

    // Spread edges vertically: -15, 0, +15 for 3 edges from same source
    const spacing = 25
    const center = (totalCount - 1) / 2
    return (myIndex - center) * spacing
  }

  // ═══════════ SMOOTHSTEP (React Flow's getSmoothStepPath) ═══════════

  _smoothStepPath(s, t, sp, tp) {
    const offset = this.offsetValue
    const borderRadius = this.borderRadiusValue
    const fanOffset = this._getFanOffset()

    // Apply fan offset to source
    const s2 = { x: s.x, y: s.y + fanOffset }
    const t2 = { x: t.x, y: t.y }

    const points = this._getStepPoints(s2, t2, sp, tp, offset)
    if (points.length < 2) return { path: `M ${s.x},${s.y} L ${t.x},${t.y}`, labelX: (s.x + t.x) / 2, labelY: (s.y + t.y) / 2 }

    let path = `M ${s.x},${s.y}`

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]

      if (i < points.length - 1) {
        const next = points[i + 1]
        const bend = this._getBend(prev, curr, next, borderRadius)
        path += bend
      } else {
        path += ` L ${curr.x},${curr.y}`
      }
    }

    const mid = Math.floor(points.length / 2)
    const labelX = points[mid]?.x || (s.x + t.x) / 2
    const labelY = points[mid]?.y || (s.y + t.y) / 2

    return { path, labelX, labelY }
  }

  _getStepPoints(s, t, sp, tp, offset) {
    const points = [{ x: s.x, y: s.y }]

    // Opposite directions (e.g., right→left): route through midpoint
    if ((sp === "right" && tp === "left") || (sp === "left" && tp === "right")) {
      const dist = Math.abs(t.x - s.x)
      const halfDist = dist / 2
      points.push({ x: s.x + (sp === "right" ? offset : -offset), y: s.y })
      points.push({ x: s.x + (sp === "right" ? halfDist : -halfDist), y: s.y })
      points.push({ x: s.x + (sp === "right" ? halfDist : -halfDist), y: t.y })
      points.push({ x: t.x + (tp === "left" ? -offset : offset), y: t.y })
    }
    else if ((sp === "bottom" && tp === "top") || (sp === "top" && tp === "bottom")) {
      const dist = Math.abs(t.y - s.y)
      const halfDist = dist / 2
      points.push({ x: s.x, y: s.y + (sp === "bottom" ? offset : -offset) })
      points.push({ x: s.x, y: s.y + (sp === "bottom" ? halfDist : -halfDist) })
      points.push({ x: t.x, y: s.y + (sp === "bottom" ? halfDist : -halfDist) })
      points.push({ x: t.x, y: t.y + (tp === "top" ? -offset : offset) })
    }
    // Perpendicular (e.g., right→top): direct corner
    else if (sp === "right" || sp === "left") {
      const sx = s.x + (sp === "right" ? offset : -offset)
      points.push({ x: sx, y: s.y })
      if (tp === "top" || tp === "bottom") {
        const ty = t.y + (tp === "top" ? -offset : offset)
        points.push({ x: sx, y: ty })
        points.push({ x: t.x, y: ty })
      } else {
        points.push({ x: sx, y: t.y })
      }
    }
    else {
      const sy = s.y + (sp === "bottom" ? offset : -offset)
      points.push({ x: s.x, y: sy })
      if (tp === "left" || tp === "right") {
        const tx = t.x + (tp === "left" ? -offset : offset)
        points.push({ x: tx, y: sy })
        points.push({ x: tx, y: t.y })
      } else {
        points.push({ x: t.x, y: sy })
      }
    }

    points.push({ x: t.x, y: t.y })
    return points
  }

  _getBend(p1, p2, p3, radius) {
    const dx1 = p2.x - p1.x
    const dy1 = p2.y - p1.y
    const dx2 = p3.x - p2.x
    const dy2 = p3.y - p2.y

    const dist1 = Math.hypot(dx1, dy1)
    const dist2 = Math.hypot(dx2, dy2)

    if (dist1 === 0 || dist2 === 0) return ` L ${p2.x},${p2.y}`

    const r = Math.min(radius, dist1 / 2, dist2 / 2)
    const cx1 = p2.x - (dx1 / dist1) * r
    const cy1 = p2.y - (dy1 / dist1) * r
    const cx2 = p2.x + (dx2 / dist2) * r
    const cy2 = p2.y + (dy2 / dist2) * r

    return ` L ${cx1},${cy1} Q ${p2.x},${p2.y} ${cx2},${cy2}`
  }

  // ═══════════ STEP ═══════════

  _stepPath(s, t, sp, tp) {
    const { path } = this._smoothStepPath(s, t, sp, tp)
    // Step is smoothstep with borderRadius=0, but we use the same logic
    const cleanPath = path.replace(/ Q [^L]*/g, '') // Remove curves
    return { path: cleanPath, labelX: (s.x + t.x) / 2, labelY: (s.y + t.y) / 2 }
  }

  // ═══════════ STRAIGHT ═══════════

  _straightPath(s, t) {
    return { path: `M ${s.x},${s.y} L ${t.x},${t.y}`, labelX: (s.x + t.x) / 2, labelY: (s.y + t.y) / 2 }
  }

  // ═══════════ INTERACTION PATH ═══════════

  _createInteractionPath() {
    const svg = this.element.closest("svg")
    if (!svg) return
    this._interactionPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
    this._interactionPath.setAttribute("stroke", "transparent")
    this._interactionPath.setAttribute("fill", "none")
    this._interactionPath.setAttribute("stroke-width", String(this.interactionWidthValue))
    this._interactionPath.style.pointerEvents = "stroke"
    this._interactionPath.style.cursor = "pointer"
    this._interactionPath.dataset.edgeInteraction = this.idValue
    this._onInteractionClick = (e) => {
      e.stopPropagation()
      if (!this.selectableValue) return
      this.select()
      this._dispatch("edgeclick", { edgeId: this.idValue })
    }
    this._interactionPath.addEventListener("click", this._onInteractionClick)
    svg.insertBefore(this._interactionPath, this.element)
  }

  // ═══════════ RECONNECT HANDLES ═══════════

  _createReconnectHandles() {
    const svg = this.element.closest("svg")
    if (!svg) return
    
    // Source handle (invisible circle at start)
    this._sourceHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    this._sourceHandle.setAttribute("r", "8")
    this._sourceHandle.setAttribute("fill", "transparent")
    this._sourceHandle.setAttribute("stroke", "transparent")
    this._sourceHandle.setAttribute("stroke-width", "12")
    this._sourceHandle.style.cursor = "crosshair"
    this._sourceHandle.style.pointerEvents = "all"
    this._sourceHandle.dataset.edgeReconnectSource = this.idValue
    
    // Target handle (invisible circle at end)
    this._targetHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    this._targetHandle.setAttribute("r", "8")
    this._targetHandle.setAttribute("fill", "transparent")
    this._targetHandle.setAttribute("stroke", "transparent")
    this._targetHandle.setAttribute("stroke-width", "12")
    this._targetHandle.style.cursor = "crosshair"
    this._targetHandle.style.pointerEvents = "all"
    this._targetHandle.dataset.edgeReconnectTarget = this.idValue
    
    // Position handles along the path
    this._updateReconnectHandlePositions()
    
    // Drag handlers
    this._onSourceDrag = (e) => {
      e.stopPropagation()
      this._dispatch("reconnectstart", { 
        edgeId: this.idValue, 
        type: "source", 
        currentNode: this.sourceValue, 
        currentHandle: this.sourceHandleValue 
      })
    }
    this._onTargetDrag = (e) => {
      e.stopPropagation()
      this._dispatch("reconnectstart", { 
        edgeId: this.idValue, 
        type: "target", 
        currentNode: this.targetValue, 
        currentHandle: this.targetHandleValue 
      })
    }
    
    this._sourceHandle.addEventListener("pointerdown", this._onSourceDrag)
    this._targetHandle.addEventListener("pointerdown", this._onTargetDrag)
    
    svg.insertBefore(this._sourceHandle, this.element)
    svg.insertBefore(this._targetHandle, this.element)
  }
  
  _updateReconnectHandlePositions() {
    if (!this._sourceHandle || !this._targetHandle) return
    const d = this.element.getAttribute("d")
    if (!d) return
    
    // Get start point (M x,y)
    const startMatch = d.match(/M\s*([\d.-]+)[,\s]+([\d.-]+)/)
    if (startMatch) {
      this._sourceHandle.setAttribute("cx", startMatch[1])
      this._sourceHandle.setAttribute("cy", startMatch[2])
    }
    
    // Get end point (last coordinate pair)
    const coords = d.match(/([\d.-]+)[,\s]+([\d.-]+)/g)
    if (coords && coords.length >= 2) {
      const last = coords[coords.length - 1].split(/[,\s]+/)
      this._targetHandle.setAttribute("cx", last[0])
      this._targetHandle.setAttribute("cy", last[1])
    }
  }

  // ═══════════ LABEL ═══════════

  _createLabel() {
    const svg = this.element.closest("svg")
    if (!svg) return
    this._labelEl = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")
    this._labelEl.setAttribute("width", "200")
    this._labelEl.setAttribute("height", "40")
    this._labelEl.style.overflow = "visible"
    this._labelEl.style.pointerEvents = "none"

    const div = document.createElement("div")
    const [pb, pp] = this.labelBgPaddingValue
    div.style.cssText = `
      display:inline-block;padding:${pb}px ${pp}px;
      background:${this.labelShowBgValue ? "white" : "transparent"};
      border-radius:${this.labelBgBorderRadiusValue}px;
      font-size:12px;color:#64748b;white-space:nowrap;text-align:center;
      box-shadow:${this.labelShowBgValue ? "0 1px 3px rgba(0,0,0,0.08)" : "none"};
    `
    Object.assign(div.style, this.labelStyleValue)
    div.textContent = this.labelValue
    this._labelEl.appendChild(div)
    svg.appendChild(this._labelEl)
  }

  // ═══════════ MARKERS ═══════════

  _setupMarkers() {
    if (!this.markerStartValue && !this.markerEndValue) return
    const svg = this.element.closest("svg")
    if (!svg) return

    let defs = svg.querySelector("defs")
    if (!defs) { defs = document.createElementNS("http://www.w3.org/2000/svg", "defs"); svg.insertBefore(defs, svg.firstChild) }

    if (this.markerEndValue === "arrow") {
      const id = `hf-marker-${this.idValue}`
      defs.appendChild(this._createArrowMarker(id, this.markerColorValue))
      this.element.setAttribute("marker-end", `url(#${id})`)
    }
    if (this.markerStartValue === "arrow") {
      const id = `hf-marker-s-${this.idValue}`
      defs.appendChild(this._createArrowMarker(id, this.markerColorValue, true))
      this.element.setAttribute("marker-start", `url(#${id})`)
    }
  }

  _createArrowMarker(id, color, reverse = false) {
    const m = document.createElementNS("http://www.w3.org/2000/svg", "marker")
    m.setAttribute("id", id)
    m.setAttribute("viewBox", "0 0 10 10")
    m.setAttribute("refX", reverse ? "1" : "9")
    m.setAttribute("refY", "5")
    m.setAttribute("markerWidth", "12")
    m.setAttribute("markerHeight", "12")
    m.setAttribute("markerUnits", "userSpaceOnUse")
    m.setAttribute("orient", "auto-start-reverse")
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path")
    p.setAttribute("d", reverse ? "M 10 1 L 0 5 L 10 9 z" : "M 0 1 L 10 5 L 0 9 z")
    p.setAttribute("fill", color)
    m.appendChild(p)
    return m
  }

  // ═══════════ SELECTION / VISIBILITY ═══════════

  select()   { if (this.selectableValue) { this.element.classList.add("selected"); this._dispatch("edgeselect", { edgeId: this.idValue }) } }
  deselect()  { this.element.classList.remove("selected"); this._dispatch("edgedeselect", { edgeId: this.idValue }) }
  hide()     { this.hiddenValue = true; this.element.style.display = "none" }
  show()     { this.hiddenValue = false; this.element.style.display = "" }
  refresh()  { this._updatePath() }

  _dispatch(name, detail) { document.dispatchEvent(new CustomEvent(`hotwire-flow:${name}`, { detail, bubbles: true })) }
}
