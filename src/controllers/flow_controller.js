import { Controller } from "@hotwired/stimulus"

// Main canvas controller — viewport, selection, connecting, keyboard, data API,
// undo/redo, copy/paste, smooth viewport animations, fitView options.
export default class extends Controller {
  static targets = ["pane", "edges", "nodes", "connectionLine", "selectionBox"]

  static values = {
    minZoom: { type: Number, default: 0.1 },
    maxZoom: { type: Number, default: 4 },
    zoomOnScroll: { type: Boolean, default: true },
    zoomOnDoubleClick: { type: Boolean, default: true },
    zoomOnPinch: { type: Boolean, default: true },
    panOnDrag: { type: Boolean, default: true },
    panOnScroll: { type: Boolean, default: false },
    panOnScrollSpeed: { type: Number, default: 0.5 },
    selectionOnDrag: { type: Boolean, default: false },
    selectionMode: { type: String, default: "full" },
    selectNodesOnDrag: { type: Boolean, default: true },
    snapToGrid: { type: Boolean, default: false },
    snapGrid: { type: Array, default: [15, 15] },
    fitViewOnInit: { type: Boolean, default: true },
    defaultViewport: { type: Object, default: { x: 0, y: 0, zoom: 1 } },
    translateExtent: { type: Array, default: [] },
    nodeExtent: { type: Array, default: [] },
    preventScrolling: { type: Boolean, default: true },
    autoPanOnConnect: { type: Boolean, default: true },
    autoPanOnNodeDrag: { type: Boolean, default: true },
    autoPanSpeed: { type: Number, default: 15 },
    connectionMode: { type: String, default: "strict" },
    connectionRadius: { type: Number, default: 20 },
    connectionLineType: { type: String, default: "bezier" },
    nodesDraggable: { type: Boolean, default: true },
    nodesConnectable: { type: Boolean, default: true },
    elementsSelectable: { type: Boolean, default: true },
    defaultEdgeOptions: { type: Object, default: { type: "bezier", animated: false, markerEnd: "arrow" } }
  }

  connect() {
    this.viewport = { ...this.defaultViewportValue }
    this.isPanning = false
    this.selectionStart = null
    this.selectedNodes = new Set()
    this.selectedEdges = new Set()
    this.isConnecting = false
    this.connectingFrom = null
    this.draggedNode = null
    this.dragOffset = { x: 0, y: 0 }
    this.spaceHeld = false
    this.isSelecting = false
    this._autoPanRaf = null
    this._animRaf = null

    // Undo/redo
    this._undoStack = []
    this._redoStack = []
    this._maxHistory = 100
    this._dragStartPositions = null

    // Copy/paste
    this._clipboard = []

    this._nodes = new Map()
    this._edges = new Map()
    this._loadInitialElements()

    this._applyTransform()
    this._bindEvents()

    if (this.fitViewOnInitValue) {
      requestAnimationFrame(() => this.fitView())
    }

    this._emit("ready", { viewport: this.viewport })
  }

  disconnect() {
    this._unbindEvents()
    if (this._autoPanRaf) cancelAnimationFrame(this._autoPanRaf)
  }

  _emit(name, detail = {}) {
    this.element.dispatchEvent(new CustomEvent(`hotwire-flow:${name}`, { detail, bubbles: true }))
  }

  // ── Events ──────────────────────────────────────────────

  _bindEvents() {
    this._onWheel = this._handleWheel.bind(this)
    this._onPointerDown = this._handlePointerDown.bind(this)
    this._onPointerMove = this._handlePointerMove.bind(this)
    this._onPointerUp = this._handlePointerUp.bind(this)
    this._onKeyDown = this._handleKeyDown.bind(this)
    this._onKeyUp = this._handleKeyUp.bind(this)
    this._onContextMenu = this._handleContextMenu.bind(this)
    this._onDblClick = this._handleDblClick.bind(this)
    this._onReconnectStart = this._handleReconnectStart.bind(this)

    this.element.addEventListener("wheel", this._onWheel, { passive: false })
    this.element.addEventListener("pointerdown", this._onPointerDown)
    this.element.addEventListener("pointermove", this._onPointerMove)
    this.element.addEventListener("pointerup", this._onPointerUp)
    this.element.addEventListener("contextmenu", this._onContextMenu)
    this.element.addEventListener("dblclick", this._onDblClick)
    document.addEventListener("keydown", this._onKeyDown)
    document.addEventListener("keyup", this._onKeyUp)
    document.addEventListener("hotwire-flow:reconnectstart", this._onReconnectStart)
  }

  _unbindEvents() {
    this.element.removeEventListener("wheel", this._onWheel)
    this.element.removeEventListener("pointerdown", this._onPointerDown)
    this.element.removeEventListener("pointermove", this._onPointerMove)
    this.element.removeEventListener("pointerup", this._onPointerUp)
    this.element.removeEventListener("contextmenu", this._onContextMenu)
    this.element.removeEventListener("dblclick", this._onDblClick)
    document.removeEventListener("keydown", this._onKeyDown)
    document.removeEventListener("keyup", this._onKeyUp)
    document.removeEventListener("hotwire-flow:reconnectstart", this._onReconnectStart)
  }

  _handleWheel(event) {
    if (this.preventScrollingValue) event.preventDefault()
    if ((event.ctrlKey || event.metaKey) && this.zoomOnScrollValue) {
      const delta = -event.deltaY * 0.001
      const rect = this.element.getBoundingClientRect()
      this.zoomAt(delta, { x: event.clientX - rect.left, y: event.clientY - rect.top })
    } else if (this.panOnScrollValue) {
      this.panBy(-event.deltaX * this.panOnScrollSpeedValue, -event.deltaY * this.panOnScrollSpeedValue)
    } else if (this.zoomOnScrollValue) {
      const delta = -event.deltaY * 0.001
      const rect = this.element.getBoundingClientRect()
      this.zoomAt(delta, { x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
  }

  _handlePointerDown(event) {
    if (event.button === 2) return
    const node = event.target.closest("[data-flow-node]")
    const handle = event.target.closest("[data-handle]")
    const edgeInteraction = event.target.closest("[data-edge-interaction]")
    if (node || handle) return

    if (edgeInteraction) {
      const edgeId = edgeInteraction.dataset.edgeInteraction
      if (!event.shiftKey) this.clearSelection()
      this.selectedEdges.add(edgeId)
      this._emit("edgeclick", { edgeId })
      return
    }

    if (!event.shiftKey) this.clearSelection()
    this._emit("paneclick", { position: this.screenToFlow(event.clientX, event.clientY) })

    if (this.selectionOnDragValue && !this.spaceHeld) this._startSelection(event)
    else if (this.panOnDragValue) this._startPan(event)
  }

  _handlePointerMove(event) {
    if (this.isPanning) this._doPan(event)
    else if (this.isSelecting) this._doSelection(event)
    else if (this.isConnecting) {
      const rect = this.element.getBoundingClientRect()
      const x = (event.clientX - rect.left - this.viewport.x) / this.viewport.zoom
      const y = (event.clientY - rect.top - this.viewport.y) / this.viewport.zoom
      this.updateConnecting(x, y)
      if (this.autoPanOnConnectValue) this._autoPan(event.clientX, event.clientY)
    }
  }

  _handlePointerUp() {
    if (this.isPanning) this._endPan()
    else if (this.isSelecting) this._endSelection()
    this._stopAutoPan()
  }

  _startPan(event) {
    this.isPanning = true
    this.panStart = { x: event.clientX, y: event.clientY }
    this.panViewportStart = { x: this.viewport.x, y: this.viewport.y }
    this.element.classList.add("dragging-canvas")
    this.element.setPointerCapture(event.pointerId)
  }
  _doPan(event) {
    this.viewport.x = this.panViewportStart.x + (event.clientX - this.panStart.x)
    this.viewport.y = this.panViewportStart.y + (event.clientY - this.panStart.y)
    this._applyTranslateExtent(); this._applyTransform(); this._emitViewportChange()
  }
  _endPan() { this.isPanning = false; this.element.classList.remove("dragging-canvas") }

  _startSelection(event) {
    this.isSelecting = true
    const rect = this.element.getBoundingClientRect()
    this.selectionStart = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    this._showSelectionBox(this.selectionStart, this.selectionStart)
  }
  _doSelection(event) {
    const rect = this.element.getBoundingClientRect()
    const current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    this._showSelectionBox(this.selectionStart, current)
    this._selectNodesInBox(this.selectionStart, current)
  }
  _endSelection() { this.isSelecting = false; this._hideSelectionBox() }

  _showSelectionBox(start, end) {
    if (!this.hasSelectionBoxTarget) return
    const box = this.selectionBoxTarget
    box.classList.remove("hidden")
    box.style.left = `${Math.min(start.x, end.x)}px`
    box.style.top = `${Math.min(start.y, end.y)}px`
    box.style.width = `${Math.abs(end.x - start.x)}px`
    box.style.height = `${Math.abs(end.y - start.y)}px`
  }
  _hideSelectionBox() { if (this.hasSelectionBoxTarget) this.selectionBoxTarget.classList.add("hidden") }

  _selectNodesInBox(start, end) {
    const s = this.screenToFlow(Math.min(start.x, end.x), Math.min(start.y, end.y))
    const e = this.screenToFlow(Math.max(start.x, end.x), Math.max(start.y, end.y))
    if (!this.hasNodesTarget) return
    this.nodesTarget.querySelectorAll("[data-flow-node]").forEach(n => {
      if (this.selectionModeValue === "partial") {
        const nx = parseFloat(n.style.left), ny = parseFloat(n.style.top)
        if (nx < e.x && nx + n.offsetWidth > s.x && ny < e.y && ny + n.offsetHeight > s.y) this.selectNode(n.dataset.flowNode)
      } else {
        const cx = parseFloat(n.style.left) + n.offsetWidth / 2, cy = parseFloat(n.style.top) + n.offsetHeight / 2
        if (cx >= s.x && cx <= e.x && cy >= s.y && cy <= e.y) this.selectNode(n.dataset.flowNode)
      }
    })
  }

  _handleDblClick(event) {
    if (event.target.closest("[data-flow-node]")) return
    if (this.zoomOnDoubleClickValue) {
      const rect = this.element.getBoundingClientRect()
      this.zoomAt(0.5, { x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
  }

  _handleKeyDown(event) {
    if (event.code === "Space" && !this.spaceHeld) { this.spaceHeld = true; this.element.style.cursor = "grab" }
    if (event.key === "Delete" || event.key === "Backspace") { this._pushUndo(); this._deleteSelected() }
    if (event.key === "Escape") { this.clearSelection(); this._cancelConnecting() }
    if ((event.metaKey || event.ctrlKey) && event.key === "a") { event.preventDefault(); this._selectAll() }
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key === "z") { event.preventDefault(); this.undo() }
    if ((event.metaKey || event.ctrlKey) && (event.key === "y" || (event.shiftKey && event.key === "z"))) { event.preventDefault(); this.redo() }
    if ((event.metaKey || event.ctrlKey) && event.key === "c") { event.preventDefault(); this.copySelection() }
    if ((event.metaKey || event.ctrlKey) && event.key === "v") { event.preventDefault(); this.pasteClipboard() }
  }
  _handleKeyUp(event) { if (event.code === "Space") { this.spaceHeld = false; this.element.style.cursor = "" } }

  _handleContextMenu(event) {
    event.preventDefault()
    const node = event.target.closest("[data-flow-node]")
    this._emit("contextmenu", { x: event.clientX, y: event.clientY, nodeId: node?.dataset?.flowNode || null, flowPosition: this.screenToFlow(event.clientX, event.clientY) })
  }

  // ── Viewport ────────────────────────────────────────────

  panBy(dx, dy) { this.viewport.x += dx; this.viewport.y += dy; this._applyTranslateExtent(); this._applyTransform(); this._emitViewportChange() }

  zoomAt(delta, point) {
    const oldZoom = this.viewport.zoom
    let newZoom = Math.max(this.minZoomValue, Math.min(this.maxZoomValue, oldZoom * (1 + delta)))
    if (newZoom === oldZoom) return
    const ratio = newZoom / oldZoom
    this.viewport.x = point.x - (point.x - this.viewport.x) * ratio
    this.viewport.y = point.y - (point.y - this.viewport.y) * ratio
    this.viewport.zoom = newZoom
    this._applyTransform(); this._emitViewportChange()
  }

  zoomIn()  { const r = this.element.getBoundingClientRect(); this.zoomAt(0.2, { x: r.width / 2, y: r.height / 2 }) }
  zoomOut() { const r = this.element.getBoundingClientRect(); this.zoomAt(-0.2, { x: r.width / 2, y: r.height / 2 }) }

  setCenter(x, y, zoom = 1) {
    const rect = this.element.getBoundingClientRect()
    this.viewport = { x: rect.width / 2 - x * zoom, y: rect.height / 2 - y * zoom, zoom }
    this._applyTransform(); this._emitViewportChange()
  }

  fitView(optionsOrPadding = {}) {
    const options = typeof optionsOrPadding === "number"
      ? { padding: optionsOrPadding }
      : optionsOrPadding
    const { padding = 50, minZoom, maxZoom, duration } = options

    if (!this.hasNodesTarget) return
    const nodes = [...this.nodesTarget.querySelectorAll("[data-flow-node]")].filter(n => n.style.display !== "none")
    if (nodes.length === 0) { if (duration) this.setViewportAnimated({ x: 0, y: 0, zoom: 1 }, duration); else { this.viewport = { x: 0, y: 0, zoom: 1 }; this._applyTransform() } return }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => { const x = parseFloat(n.style.left), y = parseFloat(n.style.top); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + n.offsetWidth); maxY = Math.max(maxY, y + n.offsetHeight) })
    const rect = this.element.getBoundingClientRect(), cw = maxX - minX + padding * 2, ch = maxY - minY + padding * 2
    const clampMax = maxZoom ?? this.maxZoomValue
    const clampMin = minZoom ?? this.minZoomValue
    const zoom = Math.max(clampMin, Math.min(clampMax, Math.min(rect.width / cw, rect.height / ch)))
    const x = (rect.width - cw * zoom) / 2 - minX * zoom + padding * zoom
    const y = (rect.height - ch * zoom) / 2 - minY * zoom + padding * zoom

    if (duration) {
      this.setViewportAnimated({ x, y, zoom }, duration)
    } else {
      this.viewport = { zoom, x, y }
      this._applyTransform()
      this._emitViewportChange()
    }
  }

  setViewport(vp) { Object.assign(this.viewport, vp); this._applyTransform(); this._emitViewportChange() }
  getViewport() { return { ...this.viewport } }

  screenToFlow(x, y) { const r = this.element.getBoundingClientRect(); return { x: (x - r.left - this.viewport.x) / this.viewport.zoom, y: (y - r.top - this.viewport.y) / this.viewport.zoom } }
  flowToScreen(x, y) { const r = this.element.getBoundingClientRect(); return { x: x * this.viewport.zoom + this.viewport.x + r.left, y: y * this.viewport.zoom + this.viewport.y + r.top } }

  _applyTranslateExtent() {
    if (!this.translateExtentValue || this.translateExtentValue.length < 2) return
    const [[minX, minY], [maxX, maxY]] = this.translateExtentValue
    this.viewport.x = Math.max(minX, Math.min(maxX, this.viewport.x))
    this.viewport.y = Math.max(minY, Math.min(maxY, this.viewport.y))
  }

  // ── Auto-pan ────────────────────────────────────────────

  _autoPan(clientX, clientY) {
    const rect = this.element.getBoundingClientRect(), threshold = 40, speed = this.autoPanSpeedValue
    let dx = 0, dy = 0
    if (clientX - rect.left < threshold) dx = speed; else if (rect.right - clientX < threshold) dx = -speed
    if (clientY - rect.top < threshold) dy = speed; else if (rect.bottom - clientY < threshold) dy = -speed
    if (dx || dy) { this.panBy(dx, dy); this._autoPanRaf = requestAnimationFrame(() => this._autoPan(clientX, clientY)) }
    else this._stopAutoPan()
  }
  _stopAutoPan() { if (this._autoPanRaf) { cancelAnimationFrame(this._autoPanRaf); this._autoPanRaf = null } }

  // ── Selection ───────────────────────────────────────────

  selectNode(id) {
    this.selectedNodes.add(id)
    if (this.hasNodesTarget) { const el = this.nodesTarget.querySelector(`[data-flow-node="${id}"]`); if (el) el.classList.add("selected") }
    this._emit("nodeselect", { nodeId: id })
  }
  deselectNode(id) {
    this.selectedNodes.delete(id)
    if (this.hasNodesTarget) { const el = this.nodesTarget.querySelector(`[data-flow-node="${id}"]`); if (el) el.classList.remove("selected") }
    this._emit("nodedeselect", { nodeId: id })
  }
  clearSelection() {
    this.selectedNodes.forEach(id => { if (this.hasNodesTarget) { const el = this.nodesTarget.querySelector(`[data-flow-node="${id}"]`); if (el) el.classList.remove("selected") } })
    this.selectedNodes.clear(); this.selectedEdges.clear()
  }
  _selectAll() { if (this.hasNodesTarget) this.nodesTarget.querySelectorAll("[data-flow-node]").forEach(el => this.selectNode(el.dataset.flowNode)) }

  // ── Node Drag ───────────────────────────────────────────

  startNodeDrag(nodeId, event) {
    this._dragStartPositions = this._snapshot()
    this.draggedNode = nodeId
    const el = this.hasNodesTarget ? this.nodesTarget.querySelector(`[data-flow-node="${nodeId}"]`) : null
    if (!el) return
    this.dragOffset = { x: event.clientX, y: event.clientY, nodeX: parseFloat(el.style.left) || 0, nodeY: parseFloat(el.style.top) || 0 }
    if (!this.selectedNodes.has(nodeId)) { if (!event.shiftKey) this.clearSelection(); this.selectNode(nodeId) }
  }
  updateNodeDrag(event) {
    if (!this.draggedNode) return
    const dx = (event.clientX - this.dragOffset.x) / this.viewport.zoom
    const dy = (event.clientY - this.dragOffset.y) / this.viewport.zoom
    const newX = this.dragOffset.nodeX + dx, newY = this.dragOffset.nodeY + dy
    this._moveNode(this.draggedNode, newX, newY)
    if (this.hasNodesTarget) this.selectedNodes.forEach(id => { if (id === this.draggedNode) return; const el = this.nodesTarget.querySelector(`[data-flow-node="${id}"]`); if (!el) return; this._moveNode(id, newX + parseFloat(el.dataset.dragOffsetX || 0), newY + parseFloat(el.dataset.dragOffsetY || 0)) })
    if (this.autoPanOnNodeDragValue) this._autoPan(event.clientX, event.clientY)
  }
  endNodeDrag() {
    if (this.draggedNode) {
      // Only push undo if node position actually changed
      const current = this._snapshot()
      if (this._dragStartPositions) {
        const prevNode = this._dragStartPositions.nodes.find(n => n.id === this.draggedNode)
        const curNode = current.nodes.find(n => n.id === this.draggedNode)
        if (prevNode && curNode && (prevNode.position.x !== curNode.position.x || prevNode.position.y !== curNode.position.y)) {
          this._undoStack.push(this._dragStartPositions)
          this._redoStack = []
          if (this._undoStack.length > this._maxHistory) this._undoStack.shift()
        }
      }
      this._emit("nodedragend", { nodeId: this.draggedNode })
    }
    this._dragStartPositions = null
    this.draggedNode = null
    this._stopAutoPan()
  }

  _moveNode(nodeId, x, y) {
    if (this.snapToGridValue) { const [gx, gy] = this.snapGridValue; x = Math.round(x / gx) * gx; y = Math.round(y / gy) * gy }
    if (this.nodeExtentValue?.length >= 2) { const [[nx, ny], [mx, my]] = this.nodeExtentValue; x = Math.max(nx, Math.min(mx, x)); y = Math.max(ny, Math.min(my, y)) }
    if (!this.hasNodesTarget) return
    const el = this.nodesTarget.querySelector(`[data-flow-node="${nodeId}"]`); if (!el) return
    el.style.left = `${x}px`; el.style.top = `${y}px`
    this._emit("nodemove", { nodeId, x, y })
    this._updateEdgesForNode(nodeId)
  }

  // ── Connecting ──────────────────────────────────────────

  startConnecting(handleId, nodeId, position) { this.isConnecting = true; this.connectingFrom = { handleId, nodeId, position }; this.element.classList.add("connecting"); this._emit("connectionstart", this.connectingFrom) }
  updateConnecting(x, y) { if (!this.isConnecting) return; this._emit("connectionmove", { from: this.connectingFrom, x, y }) }

  endConnecting(targetHandleId, targetNodeId) {
    if (!this.isConnecting) return
    if (targetHandleId && targetNodeId && targetNodeId !== this.connectingFrom.nodeId) {
      const connection = { sourceNode: this.connectingFrom.nodeId, sourceHandle: this.connectingFrom.handleId, targetNode: targetNodeId, targetHandle: targetHandleId }
      this._emit("connect", connection)
    }
    this.isConnecting = false; this.connectingFrom = null
    this.element.classList.remove("connecting"); this._emit("connectionend"); this._stopAutoPan()
  }
  _cancelConnecting() { if (this.isConnecting) { this.isConnecting = false; this.connectingFrom = null; this.element.classList.remove("connecting"); this._emit("connectioncancel") } }
  _updateEdgesForNode(nodeId) { this._emit("updateedges", { nodeId }) }

  // ── Edge Reconnect ──────────────────────────────────────

  _handleReconnectStart(event) {
    if (this.isConnecting) return // Already connecting
    const { edgeId, type, currentNode, currentHandle } = event.detail
    this._reconnectState = { edgeId, type } // 'source' or 'target'
    
    // Start connecting from the current handle
    this.startConnecting(currentHandle, currentNode, this._getHandlePosition(currentHandle))
    
    // Listen for connection end to complete the reconnect
    const onConnectionEnd = (e) => {
      if (e.type === "hotwire-flow:connectionend") {
        document.removeEventListener("hotwire-flow:connectionend", onConnectionEnd)
        document.removeEventListener("hotwire-flow:connectioncancel", onConnectionEnd)
        this._completeReconnect(edgeId, type)
      }
    }
    document.addEventListener("hotwire-flow:connectionend", onConnectionEnd)
    document.addEventListener("hotwire-flow:connectioncancel", onConnectionEnd)
  }
  
  _getHandlePosition(handleId) {
    // Find the handle element and return its position
    const handle = document.querySelector(`[data-handle="${handleId}"]`)
    if (!handle) return "right"
    return handle.dataset.flowHandlePositionValue || "right"
  }
  
  _completeReconnect(edgeId, type) {
    if (!this.connectingFrom) return // Connection was cancelled
    
    const edge = this._edges.get(edgeId)
    if (!edge) return
    
    this._pushUndo()
    
    if (type === "source") {
      edge.source = this.connectingFrom.nodeId
      edge.sourceHandle = this.connectingFrom.handleId
    } else {
      edge.target = this.connectingFrom.nodeId
      edge.targetHandle = this.connectingFrom.handleId
    }
    
    this._emit("reconnect", { edgeId, type, newNode: this.connectingFrom.nodeId, newHandle: this.connectingFrom.handleId })
    this._updateEdgesForNode(edge.source)
    this._updateEdgesForNode(edge.target)
    
    this._reconnectState = null
  }

  // ── Deletion ────────────────────────────────────────────

  _deleteSelected() {
    this.selectedNodes.forEach(id => { const el = this.hasNodesTarget ? this.nodesTarget.querySelector(`[data-flow-node="${id}"]`) : null; if (el) { this._emit("nodedelete", { nodeId: id }); el.remove(); this._nodes.delete(id) } })
    this.selectedEdges.forEach(id => { this._emit("edgedelete", { edgeId: id }); document.querySelector(`[data-edge="${id}"]`)?.remove(); this._edges.delete(id) })
    this.clearSelection()
  }

  // ── Data API ────────────────────────────────────────────

  _loadInitialElements() {
    if (this.hasNodesTarget) this.nodesTarget.querySelectorAll("[data-flow-node]").forEach(el => {
      this._nodes.set(el.dataset.flowNode, { id: el.dataset.flowNode, type: el.dataset.nodeType || "default", position: { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 }, data: {} })
    })
  }

  addNode(nodeDef) { this._nodes.set(nodeDef.id, nodeDef); this._emit("nodesadd", { nodes: [nodeDef] }) }
  removeNode(id) { this._pushUndo(); this._nodes.delete(id); this.hasNodesTarget && this.nodesTarget.querySelector(`[data-flow-node="${id}"]`)?.remove(); this.selectedNodes.delete(id); this._emit("nodedelete", { nodeId: id }) }
  addEdge(edgeDef) { this._edges.set(edgeDef.id, edgeDef); this._emit("edgesadd", { edges: [edgeDef] }) }
  removeEdge(id) { this._pushUndo(); this._edges.delete(id); document.querySelector(`[data-edge="${id}"]`)?.remove(); this.selectedEdges.delete(id); this._emit("edgedelete", { edgeId: id }) }

  getNode(id) { return this._nodes.get(id) || null }
  getNodes() { return Array.from(this._nodes.values()) }
  getEdge(id) { return this._edges.get(id) || null }
  getEdges() { return Array.from(this._edges.values()) }

  getIncomers(nodeId) { const r = []; this._edges.forEach(e => { if (e.target === nodeId) { const n = this._nodes.get(e.source); if (n) r.push(n) } }); return r }
  getOutgoers(nodeId) { const r = []; this._edges.forEach(e => { if (e.source === nodeId) { const n = this._nodes.get(e.target); if (n) r.push(n) } }); return r }
  getConnectedEdges(nodeId) { const r = []; this._edges.forEach(e => { if (e.source === nodeId || e.target === nodeId) r.push(e) }); return r }

  getNodesBounds(nodes) {
    if (!nodes?.length) return { x: 0, y: 0, width: 0, height: 0 }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    nodes.forEach(n => { x1 = Math.min(x1, n.position.x); y1 = Math.min(y1, n.position.y); x2 = Math.max(x2, n.position.x + (n.width || 150)); y2 = Math.max(y2, n.position.y + (n.height || 80)) })
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
  }

  toObject() { return { nodes: this.getNodes(), edges: this.getEdges(), viewport: { ...this.viewport } } }
  fromObject(obj) { if (obj.viewport) this.setViewport(obj.viewport); this._emit("restore", obj) }

  // ── Undo/Redo ───────────────────────────────────────────

  _snapshot() {
    return JSON.parse(JSON.stringify({ nodes: this.getNodes(), edges: this.getEdges() }))
  }

  _pushUndo() {
    this._undoStack.push(this._snapshot())
    this._redoStack = []
    if (this._undoStack.length > this._maxHistory) this._undoStack.shift()
  }

  undo() {
    if (this._undoStack.length === 0) return
    const current = this._snapshot()
    this._redoStack.push(current)
    const prev = this._undoStack.pop()
    this._applySnapshot(prev)
    this._emit("undo", { snapshot: prev })
  }

  redo() {
    if (this._redoStack.length === 0) return
    const current = this._snapshot()
    this._undoStack.push(current)
    const next = this._redoStack.pop()
    this._applySnapshot(next)
    this._emit("redo", { snapshot: next })
  }

  _applySnapshot(snapshot) {
    // Remove current nodes/edges that aren't in snapshot
    const snapNodeIds = new Set(snapshot.nodes.map(n => n.id))
    const snapEdgeIds = new Set(snapshot.edges.map(e => e.id))
    this._nodes.forEach((_, id) => { if (!snapNodeIds.has(id)) this.removeNode(id) })
    this._edges.forEach((_, id) => { if (!snapEdgeIds.has(id)) this.removeEdge(id) })

    // Add/update nodes from snapshot
    snapshot.nodes.forEach(nDef => {
      const existing = this._nodes.get(nDef.id)
      if (existing) {
        Object.assign(existing, nDef)
        const el = this.hasNodesTarget ? this.nodesTarget.querySelector(`[data-flow-node="${nDef.id}"]`) : null
        if (el) { el.style.left = `${nDef.position.x}px`; el.style.top = `${nDef.position.y}px` }
        this._updateEdgesForNode(nDef.id)
      } else {
        this._nodes.set(nDef.id, nDef)
        this._emit("nodesadd", { nodes: [nDef] })
      }
    })

    // Add edges from snapshot
    snapshot.edges.forEach(eDef => {
      if (!this._edges.has(eDef.id)) {
        this._edges.set(eDef.id, eDef)
        this._emit("edgesadd", { edges: [eDef] })
      }
    })

    this._emit("restore", snapshot)
  }

  get canUndo() { return this._undoStack.length > 0 }
  get canRedo() { return this._redoStack.length > 0 }

  // ── Copy/Paste ──────────────────────────────────────────

  copySelection() {
    if (this.selectedNodes.size === 0) return
    this._clipboard = []
    const selectedIds = new Set(this.selectedNodes)
    // Copy selected nodes
    selectedIds.forEach(id => {
      const node = this._nodes.get(id)
      if (node) this._clipboard.push({ ...node, position: { ...node.position }, data: JSON.parse(JSON.stringify(node.data || {})) })
    })
    // Copy edges between selected nodes
    this._edges.forEach(e => {
      if (selectedIds.has(e.source) && selectedIds.has(e.target)) {
        this._clipboard.push({ ...e, __isEdge: true })
      }
    })
    this._emit("copy", { items: this._clipboard })
  }

  pasteClipboard() {
    if (this._clipboard.length === 0) return
    this._pushUndo()
    const offset = 30
    const idMap = new Map()
    const newNodes = []
    const newEdges = []

    this._clipboard.forEach(item => {
      if (item.__isEdge) return
      const newId = `${item.id}-copy-${Date.now()}`
      idMap.set(item.id, newId)
      const nodeDef = {
        ...item,
        id: newId,
        position: { x: item.position.x + offset, y: item.position.y + offset }
      }
      this._nodes.set(newId, nodeDef)
      newNodes.push(nodeDef)
    })

    this._clipboard.forEach(item => {
      if (!item.__isEdge) return
      const newSource = idMap.get(item.source)
      const newTarget = idMap.get(item.target)
      if (!newSource || !newTarget) return
      const newId = `${item.id}-copy-${Date.now()}`
      const edgeDef = { ...item, id: newId, source: newSource, target: newTarget }
      delete edgeDef.__isEdge
      this._edges.set(newId, edgeDef)
      newEdges.push(edgeDef)
    })

    if (newNodes.length) this._emit("nodesadd", { nodes: newNodes })
    if (newEdges.length) this._emit("edgesadd", { edges: newEdges })
    this._emit("paste", { nodes: newNodes, edges: newEdges })
  }

  // ── Smooth Viewport Animations ─────────────────────────

  setViewportAnimated(vp, duration = 300) {
    if (this._animRaf) cancelAnimationFrame(this._animRaf)
    const start = { ...this.viewport }
    const startTime = performance.now()
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // easeInOutQuad
      this.viewport.x = start.x + (vp.x - start.x) * ease
      this.viewport.y = start.y + (vp.y - start.y) * ease
      this.viewport.zoom = start.zoom + ((vp.zoom ?? start.zoom) - start.zoom) * ease
      this._applyTransform()
      this._emitViewportChange()
      if (t < 1) this._animRaf = requestAnimationFrame(animate)
      else this._animRaf = null
    }
    this._animRaf = requestAnimationFrame(animate)
  }

  zoomAtAnimated(delta, point, duration = 300) {
    const oldZoom = this.viewport.zoom
    let newZoom = Math.max(this.minZoomValue, Math.min(this.maxZoomValue, oldZoom * (1 + delta)))
    const ratio = newZoom / oldZoom
    const newX = point.x - (point.x - this.viewport.x) * ratio
    const newY = point.y - (point.y - this.viewport.y) * ratio
    this.setViewportAnimated({ x: newX, y: newY, zoom: newZoom }, duration)
  }

  fitViewAnimated(padding = 50, duration = 300) {
    if (!this.hasNodesTarget) return
    const nodes = [...this.nodesTarget.querySelectorAll("[data-flow-node]")].filter(n => n.style.display !== "none")
    if (nodes.length === 0) { this.setViewportAnimated({ x: 0, y: 0, zoom: 1 }, duration); return }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => { const x = parseFloat(n.style.left), y = parseFloat(n.style.top); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + n.offsetWidth); maxY = Math.max(maxY, y + n.offsetHeight) })
    const rect = this.element.getBoundingClientRect(), cw = maxX - minX + padding * 2, ch = maxY - minY + padding * 2
    const zoom = Math.min(rect.width / cw, rect.height / ch, this.maxZoomValue)
    const x = (rect.width - cw * zoom) / 2 - minX * zoom + padding * zoom
    const y = (rect.height - ch * zoom) / 2 - minY * zoom + padding * zoom
    this.setViewportAnimated({ x, y, zoom }, duration)
  }

  // ── Helpers ─────────────────────────────────────────────

  _applyTransform() { if (this.hasPaneTarget) this.paneTarget.style.transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})` }
  _emitViewportChange() { this._emit("viewportchange", { viewport: { ...this.viewport } }) }
  get zoomPercentage() { return Math.round(this.viewport.zoom * 100) }
}
