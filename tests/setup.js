// Vitest setup — happy-dom environment
import { beforeAll, afterEach } from "vitest"

// Mock PointerEvent and setPointerCapture for happy-dom
class MockPointerEvent extends MouseEvent {
  constructor(type, props = {}) {
    super(type, { bubbles: true, cancelable: true, ...props })
    this.pointerId = props.pointerId || 1
    this.pointerType = props.pointerType || "mouse"
  }
}

beforeAll(() => {
  global.PointerEvent = MockPointerEvent

  // Mock setPointerCapture / releasePointerCapture
  HTMLElement.prototype.setPointerCapture = function () {}
  HTMLElement.prototype.releasePointerCapture = function () {}

  // Mock getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    return {
      top: 0, left: 0, bottom: 600, right: 800,
      width: 800, height: 600, x: 0, y: 0
    }
  }
})

afterEach(() => {
  document.body.innerHTML = ""
})
