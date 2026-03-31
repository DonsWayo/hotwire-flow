// Shared utility — get the flow controller from the DOM.
// Used by controllers that can't resolve outlets across subtrees.
export function getFlowController(application, canvasId = "flow-canvas") {
  try {
    const canvas = document.getElementById(canvasId)
    if (!canvas || !application) return null
    return application.getControllerForElementAndIdentifier(canvas, "flow")
  } catch (e) { return null }
}
