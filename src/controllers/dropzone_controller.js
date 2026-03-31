import { Controller } from "@hotwired/stimulus"

// Drop zone on the canvas — receives DnD from sidebar to create nodes.
export default class extends Controller {
  static outlets = ["flow"]

  dragOver(event) {
    if (event.dataTransfer.types.includes("application/hotwire-flow-node")) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    }
  }

  dragEnter(event) {
    if (event.dataTransfer.types.includes("application/hotwire-flow-node")) event.preventDefault()
  }

  dragLeave() {}

  drop(event) {
    const data = event.dataTransfer.getData("application/hotwire-flow-node")
    if (!data) return
    event.preventDefault()

    let nodeData
    try { nodeData = JSON.parse(data) } catch (e) { return }
    const flow = this.flowOutlet
    if (!flow) return

    const pos = flow.screenToFlow(event.clientX, event.clientY)
    this.element.dispatchEvent(new CustomEvent("hotwire-flow:drop", { detail: { type: nodeData.type, label: nodeData.label, x: pos.x, y: pos.y }, bubbles: true }))
  }
}
