import { Controller } from "@hotwired/stimulus"

// Draggable sidebar node type for DnD onto canvas.
export default class extends Controller {
  static values = { type: { type: String, default: "default" }, label: { type: String, default: "" } }

  dragStart(event) {
    event.dataTransfer.setData("application/hotwire-flow-node", JSON.stringify({
      type: this.typeValue, label: this.labelValue
    }))
    event.dataTransfer.effectAllowed = "copy"
    this.element.classList.add("dragging")
  }

  dragEnd() {
    this.element.classList.remove("dragging")
  }
}
