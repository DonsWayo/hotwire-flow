// Hotwire Flow — Main entry point
export function registerHotwireFlow(application) {
  application.register("flow", FlowController)
  application.register("flow-node", NodeController)
  application.register("flow-handle", HandleController)
  application.register("flow-edge", EdgeController)
  application.register("flow-connection-line", ConnectionLineController)
  application.register("flow-minimap", MinimapController)
  application.register("flow-toolbar", ToolbarController)
  application.register("flow-background", BackgroundController)
  application.register("flow-dnd-node", DndNodeController)
  application.register("flow-dropzone", DropzoneController)
  application.register("flow-context-menu", ContextMenuController)
  application.register("flow-node-resizer", NodeResizerController)
  application.register("flow-node-toolbar", NodeToolbarController)
  application.register("flow-panel", PanelController)
  application.register("flow-toolbar-bar", ToolbarBarController)
  application.register("flow-edge-toolbar", EdgeToolbarController)
  application.register("flow-status-bar", StatusBarController)
  application.register("flow-layout", LayoutController)
}

import FlowController from "./controllers/flow_controller.js"
import NodeController from "./controllers/node_controller.js"
import HandleController from "./controllers/handle_controller.js"
import EdgeController from "./controllers/edge_controller.js"
import ConnectionLineController from "./controllers/connection_line_controller.js"
import MinimapController from "./controllers/minimap_controller.js"
import ToolbarController from "./controllers/toolbar_controller.js"
import BackgroundController from "./controllers/background_controller.js"
import DndNodeController from "./controllers/dnd_node_controller.js"
import DropzoneController from "./controllers/dropzone_controller.js"
import ContextMenuController from "./controllers/context_menu_controller.js"
import NodeResizerController from "./controllers/node_resizer_controller.js"
import NodeToolbarController from "./controllers/node_toolbar_controller.js"
import PanelController from "./controllers/panel_controller.js"
import ToolbarBarController from "./controllers/toolbar_bar_controller.js"
import EdgeToolbarController from "./controllers/edge_toolbar_controller.js"
import StatusBarController from "./controllers/status_bar_controller.js"
import LayoutController from "./controllers/layout_controller.js"

export {
  FlowController, NodeController, HandleController, EdgeController,
  ConnectionLineController, MinimapController, ToolbarController,
  BackgroundController, DndNodeController, DropzoneController,
  ContextMenuController, NodeResizerController, NodeToolbarController,
  PanelController, ToolbarBarController, EdgeToolbarController,
  StatusBarController, LayoutController
}
