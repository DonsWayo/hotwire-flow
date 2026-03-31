import { Controller } from "@hotwired/stimulus"
import { getFlowController } from "../lib/utils.js"

// Top toolbar bar — actions like save, export, undo, redo.
export default class extends Controller {
  static targets = ["zoomLevel", "nodeCount", "edgeCount", "undoBtn", "redoBtn"]

  static values = { title: { type: String, default: "Hotwire Flow" } }

  connect() {
    this._onChange = () => this._updateStats()
    this._events = ["viewportchange", "nodemove", "connect", "nodedelete", "edgedelete", "ready", "nodesadd", "edgesadd", "nodeselect", "restore", "undo", "redo"]
    this._events.forEach(e => document.addEventListener(`hotwire-flow:${e}`, this._onChange))

    // Multiple delayed updates to catch nodes after their controllers connect
    setTimeout(() => this._updateStats(), 300)
    setTimeout(() => this._updateStats(), 800)
    setTimeout(() => this._updateStats(), 1500)
    setTimeout(() => this._updateStats(), 3000)
  }

  disconnect() {
    if (this._events) this._events.forEach(e => document.removeEventListener(`hotwire-flow:${e}`, this._onChange))
  }

  _getFlow() { return getFlowController(this.application) }

  // Actions
  zoomIn()   { this._getFlow()?.zoomIn() }
  zoomOut()  { this._getFlow()?.zoomOut() }
  fitView()  { this._getFlow()?.fitView() }

  saveFlow() {
    const flow = this._getFlow()
    if (!flow) return
    const state = flow.toObject()
    localStorage.setItem("hotwire-flow-state", JSON.stringify(state))
    this._showToast("Flow saved")
  }

  loadFlow() {
    const flow = this._getFlow()
    if (!flow) return
    const saved = localStorage.getItem("hotwire-flow-state")
    if (!saved) { this._showToast("No saved flow found"); return }
    try {
      flow.fromObject(JSON.parse(saved))
      this._showToast("Flow loaded")
    } catch (e) {
      this._showToast("Failed to load — corrupted data")
    }
  }

  clearFlow() {
    const flow = this._getFlow()
    if (!flow) return
    const state = flow.toObject()
    state.nodes.forEach(n => flow.removeNode(n.id))
    state.edges.forEach(e => flow.removeEdge(e.id))
    this._showToast("Canvas cleared")
  }

  exportJSON() {
    const flow = this._getFlow()
    if (!flow) return
    const state = flow.toObject()
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "flow.json"; a.click()
    URL.revokeObjectURL(url)
    this._showToast("Exported flow.json")
  }

  undo() { this._getFlow()?.undo() }

  redo() { this._getFlow()?.redo() }

  _updateStats() {
    if (this.hasZoomLevelTarget) {
      const flow = this._getFlow()
      if (flow) this.zoomLevelTarget.textContent = `${flow.zoomPercentage}%`
    }
    // Always use DOM for counts (more reliable than flow.getNodes() across timing)
    if (this.hasNodeCountTarget) {
      this.nodeCountTarget.textContent = `${document.querySelectorAll("[data-flow-node]").length} nodes`
    }
    if (this.hasEdgeCountTarget) {
      this.edgeCountTarget.textContent = `${document.querySelectorAll("path.hf-edge").length} edges`
    }
  }

  _showToast(msg) {
    const toast = document.createElement("div")
    toast.className = "hf-toast"
    toast.textContent = msg
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2000)
  }
}
