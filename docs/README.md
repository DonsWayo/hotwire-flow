# Hotwire Flow

[![npm version](https://img.shields.io/npm/v/@hotwirebits/flow.svg)](https://www.npmjs.com/package/@hotwirebits/flow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A React Flow recreation using Hotwire (Stimulus + Tailwind CSS).** Build node-based editors, workflow builders, DAGs, and org charts with pure HTML — no React required.

Like [Lexxy](https://once.com/lexxy) reimagined rich text editing for Rails, Hotwire Flow reimagines node-based graph editors for any web stack.

**[Live Demo](https://donswayo.github.io/hotwire-flow/)** | **[npm](https://www.npmjs.com/package/@hotwirebits/flow)** | **[GitHub](https://github.com/DonsWayo/hotwire-flow)**

Part of the [HotwireBits](https://github.com/DonsWayo/hotwirebits) family.

---

## Features

| Feature | Status |
|---------|--------|
| Drag & drop nodes | Done |
| Pan & zoom (scroll, pinch, ctrl+scroll) | Done |
| SVG edges (bezier, straight, step, smoothstep) | Done |
| Animated edges | Done |
| Edge labels (HTML via foreignObject) | Done |
| Arrow markers | Done |
| Connection handles (drag to connect) | Done |
| Node types (input, output, default, group) | Done |
| Multi-select (shift+click, drag-select box) | Done |
| Minimap with viewport indicator | Done |
| Toolbar (zoom in/out, fit view, reset) | Done |
| Top toolbar bar (save, load, export) | Done |
| Status bar (zoom, position, node/edge counts) | Done |
| Background patterns (dots, grid, lines) | Done |
| DnD sidebar palette | Done |
| Context menu (right-click) | Done |
| Keyboard shortcuts (Delete, Ctrl+A, Escape, Space+pan) | Done |
| Save/Load to localStorage | Done |
| Data API (addNode, removeNode, getIncomers, getOutgoers, toObject) | Done |
| NodeResizer (8-handle resize) | Done |
| NodeToolbar (floating toolbar) | Done |
| Panel (positioned UI container) | Done |
| Undo/Redo (Ctrl+Z, Ctrl+Y) | Done |
| Copy/Paste (Ctrl+C, Ctrl+V) | Done |
| Smooth viewport animations | Done |
| fitViewOptions (padding, minZoom, maxZoom) | Done |
| Auto Layout (vertical/horizontal) | Done |
| defaultEdgeOptions | Done |

## Quick Start

### Install

```bash
npm install @hotwirebits/flow
```

This will also install `@hotwired/stimulus` as a dependency.

### 1. Include CSS

```html
<link rel="stylesheet" href="node_modules/@hotwirebits/flow/dist/hotwire-flow.css">
```

Or import in your build tool:

```js
import "@hotwirebits/flow/css"
```

### 2. Import and register

```js
import { Application } from "@hotwired/stimulus"
import { registerHotwireFlow } from "@hotwirebits/flow"

const app = Application.start()
registerHotwireFlow(app)
```

### 3. Write your graph in HTML

```html
<div data-controller="flow" class="hf-canvas" id="canvas">
  <div data-flow-target="pane" class="hf-pane">
    <svg style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1">
      <path data-controller="flow-edge"
            data-flow-edge-id-value="e1"
            data-flow-edge-source-value="n1"
            data-flow-edge-source-handle-value="n1-r"
            data-flow-edge-target-value="n2"
            data-flow-edge-target-handle-value="n2-l"
            data-flow-edge-type-value="bezier"
            data-flow-edge-animated-value="true"
            data-flow-edge-marker-end-value="arrow"
            class="hf-edge" />
    </svg>
    <div data-flow-target="nodes" class="hf-nodes">
      <!-- Node 1 -->
      <div data-controller="flow-node"
           data-flow-node-id-value="n1"
           data-flow-node-x-value="100" data-flow-node-y-value="200"
           class="hf-node hf-node--input"
           data-action="pointerdown->flow-node#pointerDown click->flow-node#click">
        <div class="hf-node__header">Input</div>
        <div class="hf-node__body">Data source</div>
        <div data-controller="flow-handle"
             data-flow-handle-id-value="n1-r"
             data-flow-handle-node-id-value="n1"
             data-flow-handle-position-value="right"
             class="hf-handle hf-handle--right"
             data-action="pointerdown->flow-handle#pointerDown"></div>
      </div>
      <!-- Node 2 -->
      <div data-controller="flow-node"
           data-flow-node-id-value="n2"
           data-flow-node-x-value="400" data-flow-node-y-value="200"
           class="hf-node hf-node--output"
           data-action="pointerdown->flow-node#pointerDown click->flow-node#click">
        <div data-controller="flow-handle"
             data-flow-handle-id-value="n2-l"
             data-flow-handle-node-id-value="n2"
             data-flow-handle-position-value="left"
             class="hf-handle hf-handle--left"
             data-action="pointerdown->flow-handle#pointerDown"></div>
        <div class="hf-node__header">Output</div>
        <div class="hf-node__body">Result</div>
      </div>
    </div>
  </div>
  <div data-flow-target="selectionBox" class="hf-selection-box"></div>
</div>
```

### CDN Usage

You can also use Hotwire Flow directly from a CDN without any build step:

```html
<link rel="stylesheet" href="https://unpkg.com/@hotwirebits/flow@0.1.0/dist/hotwire-flow.css">

<script type="module">
  import { Application } from "https://unpkg.com/@hotwired/stimulus/dist/stimulus.js"
  import { registerHotwireFlow } from "https://unpkg.com/@hotwirebits/flow@0.1.0/src/index.js"

  const app = Application.start()
  registerHotwireFlow(app)
</script>
```

## Examples

See all examples live at **[donswayo.github.io/hotwire-flow](https://donswayo.github.io/hotwire-flow/)**.

| Example | Description |
|---------|-------------|
| [Full Demo](examples/full-demo.html) | Complete workflow editor with all UI components |
| [DAG Pipeline](examples/dag-pipeline.html) | 6-node ETL data pipeline |
| [Interactive](examples/interactive.html) | Dark theme with DnD sidebar, categorized nodes |
| [Save/Load](examples/save-load.html) | localStorage persistence |
| [Custom Nodes](examples/custom-nodes.html) | Note, Code, Image, Decision node types |
| [Minimap Demo](examples/minimap-demo.html) | Large graph with minimap navigation |
| [Minimal](examples/minimal.html) | Simplest 2-node setup |
| [Org Chart](examples/org-chart.html) | B2B company hierarchy |
| [Warehouse](examples/warehouse.html) | B2B warehouse operations flow |
| [B2B Order](examples/b2b-order.html) | B2B order processing pipeline |
| [Node Resizer](examples/node-resizer-demo.html) | Resizable nodes with 8 handles |
| [Node Toolbar](examples/node-toolbar-demo.html) | Floating toolbar on selected nodes |
| [Layout Demo](examples/layout-demo.html) | Auto layout (vertical/horizontal) |

## Controllers

| Controller | Identifier | Purpose |
|-----------|-----------|---------|
| `FlowController` | `flow` | Main canvas — pan/zoom/selection/data API |
| `NodeController` | `flow-node` | Node drag/select/position |
| `HandleController` | `flow-handle` | Connection points |
| `EdgeController` | `flow-edge` | SVG paths + labels + markers |
| `ConnectionLineController` | `flow-connection-line` | Live drag connection |
| `MinimapController` | `flow-minimap` | Graph overview |
| `ToolbarController` | `flow-toolbar` | Zoom controls |
| `BackgroundController` | `flow-background` | Dots/grid/lines |
| `ToolbarBarController` | `flow-toolbar-bar` | Top bar (save/export) |
| `StatusBarController` | `flow-status-bar` | Bottom bar (position/counts) |
| `DndNodeController` | `flow-dnd-node` | Drag source |
| `DropzoneController` | `flow-dropzone` | Drop target |
| `ContextMenuController` | `flow-context-menu` | Right-click menu |
| `NodeResizerController` | `flow-node-resizer` | 8-handle resize |
| `NodeToolbarController` | `flow-node-toolbar` | Floating node toolbar |
| `PanelController` | `flow-panel` | Positioned panel |
| `LayoutController` | `flow-layout` | Auto-layout (vertical/horizontal) |

## CSS Classes

| Class | Purpose |
|-------|---------|
| `hf-canvas` | Canvas container |
| `hf-pane` | Transform pane |
| `hf-node` | Node base |
| `hf-node--input` | Input node (green) |
| `hf-node--default` | Default node (blue) |
| `hf-node--output` | Output node (red) |
| `hf-node__header` | Node header |
| `hf-node__body` | Node body |
| `hf-handle` | Handle base |
| `hf-handle--top/right/bottom/left` | Handle position |
| `hf-edge` | Edge SVG path |
| `hf-edge.animated` | Animated edge |
| `hf-selection-box` | Drag-select box |
| `hf-controls` | Zoom controls |
| `hf-toolbar-bar` | Top toolbar |
| `hf-status-bar` | Bottom status |
| `hf-sidebar` | Node palette |
| `hf-minimap` | Minimap |
| `hf-context-menu` | Right-click menu |
| `hf-panel` | Positioned panel |

## API

```js
const flow = app.getControllerForElementAndIdentifier(canvas, "flow")

// Viewport
flow.zoomIn()
flow.zoomOut()
flow.fitView()
flow.setViewport({ x: 0, y: 0, zoom: 1 })
flow.panBy(100, 50)
flow.setCenter(400, 300, 2)

// Coordinates
const pos = flow.screenToFlow(mouseX, mouseY)
const screen = flow.flowToScreen(flowX, flowY)

// Selection
flow.selectNode("node-1")
flow.clearSelection()

// Data
flow.getNodes()           // [{id, type, position, data}, ...]
flow.getNode("node-1")    // {id, type, position, data}
flow.getIncomers("n2")    // nodes with edges pointing to n2
flow.getOutgoers("n1")    // nodes with edges from n1
flow.toObject()           // {nodes, edges, viewport}
flow.fromObject(state)    // restore state

// Node management
flow.addNode({ id: "n3", type: "default", position: {x:100, y:100} })
flow.removeNode("n1")
flow.addEdge({ id: "e2", source: "n1", target: "n3" })
flow.removeEdge("e1")
```

## Events

All events dispatched on the canvas element with `hotwire-flow:` prefix:

| Event | Detail |
|-------|--------|
| `ready` | `{ viewport }` |
| `viewportchange` | `{ viewport }` |
| `nodemove` | `{ nodeId, x, y }` |
| `nodeselect` | `{ nodeId }` |
| `nodedragend` | `{ nodeId }` |
| `nodedelete` | `{ nodeId }` |
| `connect` | `{ sourceNode, sourceHandle, targetNode, targetHandle }` |
| `edgeclick` | `{ edgeId }` |
| `edgedelete` | `{ edgeId }` |
| `paneclick` | `{ position }` |
| `contextmenu` | `{ x, y, nodeId, flowPosition }` |

## Development

```bash
git clone https://github.com/DonsWayo/hotwire-flow.git
cd hotwire-flow
npm install
npm run build          # Build CSS
npm test               # Unit + integration tests (200+)
npm run test:e2e       # Playwright E2E tests
npm run serve          # Dev server on :3000
```

## License

MIT
