import { Controller } from "@hotwired/stimulus"

/**
 * Edge Controller — Production-quality SVG edge rendering.
 * Ported from React Flow (xyflow/xyflow) bezier-edge.ts, smoothstep-edge.ts, straight-edge.ts,
 * MarkerDefinitions.tsx, MarkerSymbols.tsx, EdgeText.tsx, and BaseEdge.tsx.
 *
 * Supports: bezier, smoothstep, step, straight edge types.
 * Features: arrow markers (open + closed), edge labels with bg, hover/select/animated states,
 *           interaction path for wide click area, reconnect handles.
 */
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
    labelBgStyle: { type: Object, default: {} },
    labelBgPadding: { type: Array, default: [2, 4] },
    labelBgBorderRadius: { type: Number, default: 2 },
    hidden: { type: Boolean, default: false },
    deletable: { type: Boolean, default: true },
    selectable: { type: Boolean, default: true },
    interactionWidth: { type: Number, default: 20 },
    reconnectable: { type: Boolean, default: true },
    markerStart: { type: String, default: "" },
    markerEnd: { type: String, default: "arrowclosed" },
    markerColor: { type: String, default: "" },
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
    // Set stroke-width as a presentation attribute so markerUnits="strokeWidth" works in all browsers
    if (!this.element.getAttribute("stroke-width")) {
      this.element.setAttribute("stroke-width", "1.5")
    }

    this._interactionPath = null
    this._labelGroup = null
    this._sourceHandle = null
    this._targetHandle = null

    this._createInteractionPath()
    if (this.reconnectableValue) this._createReconnectHandles()
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
    this._labelGroup?.remove()
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

  _findNodesContainer() {
    return this.element.closest("svg")?.parentElement?.querySelector('[data-flow-target="nodes"]') ||
           document.querySelector('[data-flow-target="nodes"]')
  }

  // ═══════════ PATH UPDATE ═══════════

  _updatePath() {
    const container = this._findNodesContainer()
    if (!container) { if (this._retryCount < 10) this._scheduleUpdate(); return }

    const sourceEl = container.querySelector(`[data-flow-node="${this.sourceValue}"]`)
    const targetEl = container.querySelector(`[data-flow-node="${this.targetValue}"]`)
    if (!sourceEl || !targetEl) { if (this._retryCount < 10) this._scheduleUpdate(); return }

    const sp = this._getHandlePosition(sourceEl, this.sourceHandleValue)
    const tp = this._getHandlePosition(targetEl, this.targetHandleValue)

    // Offset endpoints so arrowheads sit at handle positions, not inside nodes.
    // With refX=10 on a viewBox="0 0 10 10" marker, the arrow tip lands exactly
    // at the path endpoint — no additional offset needed.
    const MARKER_OFFSET = 0
    let sx = sp.x, sy = sp.y, tx = tp.x, ty = tp.y

    if (this.markerStartValue) {
      const off = this._getMarkerOffset(sp.position, MARKER_OFFSET)
      sx += off.x; sy += off.y
    }
    if (this.markerEndValue) {
      const off = this._getMarkerOffset(tp.position, MARKER_OFFSET)
      tx += off.x; ty += off.y
    }

    let result
    switch (this.typeValue) {
      case "straight":
        result = this._getStraightPath(sx, sy, tx, ty)
        break
      case "step":
        result = this._getSmoothStepPath(sx, sy, sp.position, tx, ty, tp.position, 0)
        break
      case "smoothstep":
        result = this._getSmoothStepPath(sx, sy, sp.position, tx, ty, tp.position, this.borderRadiusValue)
        break
      default: // bezier
        result = this._getBezierPath(sx, sy, sp.position, tx, ty, tp.position)
        break
    }

    const [path, labelX, labelY] = result

    this.element.setAttribute("d", path)
    if (this._interactionPath) this._interactionPath.setAttribute("d", path)
    this._updateLabel(labelX, labelY)
    this._updateReconnectHandlePositions()
  }

  // Returns the offset direction for pulling path endpoint back from the node edge,
  // so the arrowhead tip lands exactly on the handle, not inside the node.
  _getMarkerOffset(position, distance) {
    // Pull endpoint back so arrowhead tip lands exactly at the handle position.
    // "left" handle: edge arrives from the left, so pull endpoint left (−x).
    // "right" handle: edge arrives from the right, so pull endpoint right (+x).
    // "top" handle: edge arrives from above, so pull endpoint up (−y).
    // "bottom" handle: edge arrives from below, so pull endpoint down (+y).
    switch (position) {
      case "left":   return { x: -distance, y: 0 }
      case "right":  return { x:  distance, y: 0 }
      case "top":    return { x: 0, y: -distance }
      case "bottom": return { x: 0, y:  distance }
      default:       return { x:  distance, y: 0 }
    }
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

  // ═══════════ BEZIER — exact React Flow port ═══════════

  _getBezierPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition) {
    const curvature = this.curvatureValue
    const [sourceControlX, sourceControlY] = this._getControlWithCurvature(
      sourcePosition, sourceX, sourceY, targetX, targetY, curvature
    )
    const [targetControlX, targetControlY] = this._getControlWithCurvature(
      targetPosition, targetX, targetY, sourceX, sourceY, curvature
    )
    const [labelX, labelY] = this._getBezierEdgeCenter(
      sourceX, sourceY, targetX, targetY,
      sourceControlX, sourceControlY, targetControlX, targetControlY
    )
    const path = `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`
    return [path, labelX, labelY]
  }

  // React Flow: calculateControlOffset
  _calculateControlOffset(distance, curvature) {
    if (distance >= 0) return 0.5 * distance
    return curvature * 25 * Math.sqrt(-distance)
  }

  // React Flow: getControlWithCurvature
  _getControlWithCurvature(pos, x1, y1, x2, y2, c) {
    switch (pos) {
      case "left":   return [x1 - this._calculateControlOffset(x1 - x2, c), y1]
      case "right":  return [x1 + this._calculateControlOffset(x2 - x1, c), y1]
      case "top":    return [x1, y1 - this._calculateControlOffset(y1 - y2, c)]
      case "bottom": return [x1, y1 + this._calculateControlOffset(y2 - y1, c)]
      default:       return [x1 + this._calculateControlOffset(x2 - x1, c), y1]
    }
  }

  // React Flow: getBezierEdgeCenter — cubic bezier t=0.5 midpoint
  _getBezierEdgeCenter(sourceX, sourceY, targetX, targetY, scx, scy, tcx, tcy) {
    const centerX = sourceX * 0.125 + scx * 0.375 + tcx * 0.375 + targetX * 0.125
    const centerY = sourceY * 0.125 + scy * 0.375 + tcy * 0.375 + targetY * 0.125
    return [centerX, centerY]
  }

  // ═══════════ SMOOTHSTEP — exact React Flow port ═══════════

  _getSmoothStepPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius) {
    const offset = this.offsetValue

    const [points, labelX, labelY] = this._getStepPoints(
      { x: sourceX, y: sourceY }, sourcePosition,
      { x: targetX, y: targetY }, targetPosition,
      offset
    )

    let path = `M${points[0].x} ${points[0].y}`

    for (let i = 1; i < points.length - 1; i++) {
      path += this._getBend(points[i - 1], points[i], points[i + 1], borderRadius)
    }

    path += `L${points[points.length - 1].x} ${points[points.length - 1].y}`

    return [path, labelX, labelY]
  }

  // React Flow: getPoints — orthogonal edge routing
  _getStepPoints(source, sourcePosition, target, targetPosition, offset) {
    const handleDirections = {
      left:   { x: -1, y: 0 },
      right:  { x: 1, y: 0 },
      top:    { x: 0, y: -1 },
      bottom: { x: 0, y: 1 }
    }

    const sourceDir = handleDirections[sourcePosition] || handleDirections.right
    const targetDir = handleDirections[targetPosition] || handleDirections.left

    const sourceGapped = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset }
    const targetGapped = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset }

    // Direction from source to target
    const dir = this._getDirection(sourceGapped, sourcePosition, targetGapped)
    const dirAccessor = dir.x !== 0 ? "x" : "y"
    const currDir = dir[dirAccessor]

    let points = []
    let centerX, centerY
    const sourceGapOffset = { x: 0, y: 0 }
    const targetGapOffset = { x: 0, y: 0 }

    const [defaultCenterX, defaultCenterY] = this._getEdgeCenter(source.x, source.y, target.x, target.y)

    // Opposite handle positions (e.g., right→left, bottom→top)
    if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
      centerX = (sourceGapped.x + targetGapped.x) / 2
      centerY = (sourceGapped.y + targetGapped.y) / 2

      const verticalSplit = [
        { x: centerX, y: sourceGapped.y },
        { x: centerX, y: targetGapped.y }
      ]
      const horizontalSplit = [
        { x: sourceGapped.x, y: centerY },
        { x: targetGapped.x, y: centerY }
      ]

      if (sourceDir[dirAccessor] === currDir) {
        points = dirAccessor === "x" ? verticalSplit : horizontalSplit
      } else {
        points = dirAccessor === "x" ? horizontalSplit : verticalSplit
      }
    } else {
      // Same or perpendicular directions
      const sourceTarget = [{ x: sourceGapped.x, y: targetGapped.y }]
      const targetSource = [{ x: targetGapped.x, y: sourceGapped.y }]

      if (dirAccessor === "x") {
        points = sourceDir.x === currDir ? targetSource : sourceTarget
      } else {
        points = sourceDir.y === currDir ? sourceTarget : targetSource
      }

      // Handle same positions edge case
      if (sourcePosition === targetPosition) {
        const diff = Math.abs(source[dirAccessor] - target[dirAccessor])
        if (diff <= offset) {
          const gapOffset = Math.min(offset - 1, offset - diff)
          if (sourceDir[dirAccessor] === currDir) {
            sourceGapOffset[dirAccessor] = (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) * gapOffset
          } else {
            targetGapOffset[dirAccessor] = (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) * gapOffset
          }
        }
      }

      // Mixed handle positions (e.g., right→bottom)
      if (sourcePosition !== targetPosition) {
        const dirAccessorOpposite = dirAccessor === "x" ? "y" : "x"
        const isSameDir = sourceDir[dirAccessor] === targetDir[dirAccessorOpposite]
        const sourceGtTargetOppo = sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite]
        const sourceLtTargetOppo = sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite]
        const flipSourceTarget =
          (sourceDir[dirAccessor] === 1 && ((!isSameDir && sourceGtTargetOppo) || (isSameDir && sourceLtTargetOppo))) ||
          (sourceDir[dirAccessor] !== 1 && ((!isSameDir && sourceLtTargetOppo) || (isSameDir && sourceGtTargetOppo)))
        if (flipSourceTarget) {
          points = dirAccessor === "x" ? sourceTarget : targetSource
        }
      }

      const sourceGapPoint = { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y }
      const targetGapPoint = { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y }
      const maxXDistance = Math.max(Math.abs(sourceGapPoint.x - points[0].x), Math.abs(targetGapPoint.x - points[0].x))
      const maxYDistance = Math.max(Math.abs(sourceGapPoint.y - points[0].y), Math.abs(targetGapPoint.y - points[0].y))

      if (maxXDistance >= maxYDistance) {
        centerX = (sourceGapPoint.x + targetGapPoint.x) / 2
        centerY = points[0].y
      } else {
        centerX = points[0].x
        centerY = (sourceGapPoint.y + targetGapPoint.y) / 2
      }
    }

    const gappedSource = { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y }
    const gappedTarget = { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y }

    const pathPoints = [
      source,
      ...(gappedSource.x !== points[0].x || gappedSource.y !== points[0].y ? [gappedSource] : []),
      ...points,
      ...(gappedTarget.x !== points[points.length - 1].x || gappedTarget.y !== points[points.length - 1].y ? [gappedTarget] : []),
      target
    ]

    return [pathPoints, centerX || defaultCenterX, centerY || defaultCenterY]
  }

  _getDirection(source, sourcePosition, target) {
    if (sourcePosition === "left" || sourcePosition === "right") {
      return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 }
    }
    return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 }
  }

  // React Flow: getBend — rounded corner for smoothstep
  _getBend(a, b, c, size) {
    const dist = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    const bendSize = Math.min(dist(a, b) / 2, dist(b, c) / 2, size)
    const { x, y } = b

    // No bend needed (collinear)
    if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) {
      return `L${x} ${y}`
    }

    // First segment is horizontal
    if (a.y === y) {
      const xDir = a.x < c.x ? -1 : 1
      const yDir = a.y < c.y ? 1 : -1
      return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`
    }

    // First segment is vertical
    const xDir = a.x < c.x ? 1 : -1
    const yDir = a.y < c.y ? -1 : 1
    return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`
  }

  // ═══════════ STRAIGHT ═══════════

  _getStraightPath(sourceX, sourceY, targetX, targetY) {
    const [labelX, labelY] = this._getEdgeCenter(sourceX, sourceY, targetX, targetY)
    return [`M${sourceX},${sourceY} L${targetX},${targetY}`, labelX, labelY]
  }

  // React Flow: getEdgeCenter
  _getEdgeCenter(sourceX, sourceY, targetX, targetY) {
    const xOffset = Math.abs(targetX - sourceX) / 2
    const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset
    const yOffset = Math.abs(targetY - sourceY) / 2
    const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset
    return [centerX, centerY]
  }

  // ═══════════ INTERACTION PATH ═══════════

  _createInteractionPath() {
    const svg = this.element.closest("svg")
    if (!svg) return
    this._interactionPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
    this._interactionPath.setAttribute("fill", "none")
    this._interactionPath.setAttribute("stroke-opacity", "0")
    this._interactionPath.setAttribute("stroke-width", String(this.interactionWidthValue))
    this._interactionPath.setAttribute("stroke", "transparent")
    this._interactionPath.classList.add("hf-edge-interaction")
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

    const makeHandle = (type) => {
      const h = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      h.setAttribute("r", "8")
      h.setAttribute("fill", "transparent")
      h.setAttribute("stroke", "transparent")
      h.classList.add("hf-edge-updater", `hf-edge-updater-${type}`)
      return h
    }

    this._sourceHandle = makeHandle("source")
    this._targetHandle = makeHandle("target")

    // Set data attributes for test discoverability
    this._sourceHandle.setAttribute("data-edge-reconnect-source", this.idValue)
    this._targetHandle.setAttribute("data-edge-reconnect-target", this.idValue)

    this._onSourceDrag = (e) => {
      e.stopPropagation()
      this._dispatch("reconnectstart", {
        edgeId: this.idValue, type: "source",
        currentNode: this.sourceValue, currentHandle: this.sourceHandleValue
      })
    }
    this._onTargetDrag = (e) => {
      e.stopPropagation()
      this._dispatch("reconnectstart", {
        edgeId: this.idValue, type: "target",
        currentNode: this.targetValue, currentHandle: this.targetHandleValue
      })
    }

    this._sourceHandle.addEventListener("pointerdown", this._onSourceDrag)
    this._targetHandle.addEventListener("pointerdown", this._onTargetDrag)

    svg.appendChild(this._sourceHandle)
    svg.appendChild(this._targetHandle)
  }

  _updateReconnectHandlePositions() {
    if (!this._sourceHandle || !this._targetHandle) return
    const d = this.element.getAttribute("d")
    if (!d) return

    const startMatch = d.match(/M\s*([\d.-]+)[,\s]+([\d.-]+)/)
    if (startMatch) {
      this._sourceHandle.setAttribute("cx", startMatch[1])
      this._sourceHandle.setAttribute("cy", startMatch[2])
    }

    const coords = d.match(/([\d.-]+)[,\s]+([\d.-]+)/g)
    if (coords && coords.length >= 2) {
      const last = coords[coords.length - 1].split(/[,\s]+/)
      this._targetHandle.setAttribute("cx", last[0])
      this._targetHandle.setAttribute("cy", last[1])
    }
  }

  // ═══════════ LABEL — native SVG (React Flow style) ═══════════

  _updateLabel(labelX, labelY) {
    if (!this.labelValue) return
    const svg = this.element.closest("svg")
    if (!svg) return

    if (!this._labelGroup) {
      this._labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      this._labelGroup.classList.add("hf-edge-textwrapper")
      this._labelGroup.style.pointerEvents = "all"

      // Background rect
      this._labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      this._labelBg.classList.add("hf-edge-textbg")
      const [padX, padY] = this.labelBgPaddingValue
      this._labelBg.setAttribute("rx", String(this.labelBgBorderRadiusValue))
      this._labelBg.setAttribute("ry", String(this.labelBgBorderRadiusValue))
      if (this.labelShowBgValue) {
        this._labelGroup.appendChild(this._labelBg)
      }
      if (this.labelBgStyleValue && typeof this.labelBgStyleValue === "object") {
        Object.entries(this.labelBgStyleValue).forEach(([k, v]) => this._labelBg.style[k] = v)
      }

      // Text element
      this._labelText = document.createElementNS("http://www.w3.org/2000/svg", "text")
      this._labelText.classList.add("hf-edge-text")
      this._labelText.setAttribute("dy", "0.3em")
      this._labelText.textContent = this.labelValue
      if (this.labelStyleValue && typeof this.labelStyleValue === "object") {
        Object.entries(this.labelStyleValue).forEach(([k, v]) => this._labelText.style[k] = v)
      }

      this._labelGroup.appendChild(this._labelText)
      svg.appendChild(this._labelGroup)

      // Measure text after append
      requestAnimationFrame(() => this._measureAndPositionLabel(labelX, labelY))
      return
    }

    this._measureAndPositionLabel(labelX, labelY)
  }

  _measureAndPositionLabel(labelX, labelY) {
    if (!this._labelText || !this._labelGroup) return

    let bbox
    try {
      bbox = this._labelText.getBBox()
    } catch (e) {
      // SVG not rendered yet
      return
    }

    const [padX, padY] = this.labelBgPaddingValue
    const textWidth = bbox.width
    const textHeight = bbox.height

    // Position group centered on label point
    this._labelGroup.setAttribute("transform", `translate(${labelX - textWidth / 2} ${labelY - textHeight / 2})`)

    // Position text
    this._labelText.setAttribute("y", String(textHeight / 2))

    // Position background rect
    if (this._labelBg && this.labelShowBgValue) {
      this._labelBg.setAttribute("x", String(-padX))
      this._labelBg.setAttribute("y", String(-padY))
      this._labelBg.setAttribute("width", String(textWidth + 2 * padX))
      this._labelBg.setAttribute("height", String(textHeight + 2 * padY))
    }
  }

  // ═══════════ MARKERS — React Flow style ═══════════

  _setupMarkers() {
    if (!this.markerStartValue && !this.markerEndValue) return
    const svg = this.element.closest("svg")
    if (!svg) return

    let defs = svg.querySelector("defs")
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
      svg.insertBefore(defs, svg.firstChild)
    }

    // Use explicit color, or fall back to the edge element's computed stroke color.
    // We read it here (not inside _createMarker) so the CSS class has already applied.
    const color = this.markerColorValue ||
      window.getComputedStyle(this.element).stroke ||
      "#b1b1b7"

    if (this.markerEndValue) {
      const type = this.markerEndValue
      const id = `hf-marker-end-${this.idValue}`
      if (!defs.querySelector(`#${CSS.escape(id)}`)) {
        defs.appendChild(this._createMarker(id, type, color))
      }
      this.element.setAttribute("marker-end", `url(#${id})`)
    }
    if (this.markerStartValue) {
      const type = this.markerStartValue
      const id = `hf-marker-start-${this.idValue}`
      if (!defs.querySelector(`#${CSS.escape(id)}`)) {
        defs.appendChild(this._createMarker(id, type, color))
      }
      this.element.setAttribute("marker-start", `url(#${id})`)
    }
  }

  /**
   /**
    * Create SVG marker matching React Flow's MarkerSymbols.
    * Uses markerUnits="strokeWidth" so marker size scales with edge thickness.
    * Two types:
    *   "arrow" — open arrowhead (polyline, no fill)
    *   "arrowclosed" — filled arrowhead (path with fill)
    *
    * Colors: if a custom color is provided it is used; otherwise "currentColor"
    * inherits from the referencing <path> element's stroke, so markers always
    * match the edge stroke color automatically.
    */
   _createMarker(id, type, color) {
     const m = document.createElementNS("http://www.w3.org/2000/svg", "marker")
     m.setAttribute("id", id)
     m.setAttribute("viewBox", "0 0 10 10")
     m.setAttribute("refX", "10")
     m.setAttribute("refY", "5")
     m.setAttribute("markerWidth", "12.5")
     m.setAttribute("markerHeight", "12.5")
     m.setAttribute("markerUnits", "strokeWidth")
     m.setAttribute("orient", "auto-start-reverse")
     m.classList.add("hf-arrowhead")

     // color is always resolved by _setupMarkers before calling here
     const c = color || "#b1b1b7"

     if (type === "arrow") {
       // Open arrow — chevron, no fill
       const p = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
       p.setAttribute("points", "0,0 10,5 0,10")
       p.setAttribute("fill", "none")
       p.setAttribute("stroke", c)
       p.setAttribute("stroke-width", "1.5")
       p.setAttribute("stroke-linecap", "round")
       p.setAttribute("stroke-linejoin", "round")
       p.classList.add("arrow")
       m.appendChild(p)
     } else {
       // arrowclosed — filled triangle
       const p = document.createElementNS("http://www.w3.org/2000/svg", "path")
       p.setAttribute("d", "M0,0 L10,5 L0,10 Z")
       p.setAttribute("fill", c)
       p.setAttribute("stroke", c)
       p.setAttribute("stroke-width", "1")
       p.setAttribute("stroke-linejoin", "round")
       p.classList.add("arrowclosed")
       m.appendChild(p)
     }

     return m
   }

  // ═══════════ SELECTION / VISIBILITY ═══════════

  select() {
    if (this.selectableValue) {
      this.element.classList.add("selected")
      this._dispatch("edgeselect", { edgeId: this.idValue })
    }
  }
  deselect() {
    this.element.classList.remove("selected")
    this._dispatch("edgedeselect", { edgeId: this.idValue })
  }
  hide()    { this.hiddenValue = true; this.element.style.display = "none" }
  show()    { this.hiddenValue = false; this.element.style.display = "" }
  refresh() { this._updatePath() }

  _dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(`hotwire-flow:${name}`, { detail, bubbles: true }))
  }
}
