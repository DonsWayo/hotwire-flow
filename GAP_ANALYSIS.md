# Hotwire Flow vs React Flow — Gap Analysis

## Feature Comparison Matrix

### ✅ Implemented (matching React Flow)

| Category | Feature | React Flow | Hotwire Flow |
|----------|---------|:----------:|:------------:|
| **Viewport** | Pan by drag | ✅ | ✅ |
| | Zoom by scroll | ✅ | ✅ |
| | Zoom by pinch | ✅ | ✅ |
| | Zoom by ctrl+scroll | ✅ | ✅ |
| | zoomOnDoubleClick | ✅ | ✅ |
| | panOnScroll | ✅ | ✅ |
| | panOnScrollSpeed | ✅ | ✅ |
| | Fit view | ✅ | ✅ |
| | setViewport | ✅ | ✅ |
| | getViewport | ✅ | ✅ |
| | setCenter | ✅ | ✅ |
| | translateExtent | ✅ | ✅ |
| | nodeExtent | ✅ | ✅ |
| | preventScrolling | ✅ | ✅ |
| | autoPanOnConnect | ✅ | ✅ |
| | autoPanOnNodeDrag | ✅ | ✅ |
| **Nodes** | Draggable | ✅ | ✅ |
| | Selectable | ✅ | ✅ |
| | Hidden | ✅ | ✅ |
| | Deletable | ✅ | ✅ |
| | Connectable | ✅ | ✅ |
| | zIndex | ✅ | ✅ |
| | dragHandle | ✅ | ✅ |
| | sourcePosition/targetPosition | ✅ | ✅ |
| | Node types (input/output/default/group) | ✅ | ✅ |
| | Custom node content | ✅ (React components) | ✅ (any HTML) |
| | Parent nodes (sub-flows) | ✅ | 🔶 Basic |
| **Edges** | bezier/straight/step/smoothstep | ✅ | ✅ |
| | Labels | ✅ | ✅ (foreignObject) |
| | Arrow markers | ✅ | ✅ |
| | Animated | ✅ | ✅ |
| | Hidden | ✅ | ✅ |
| | Deletable | ✅ | ✅ |
| | Selectable | ✅ | ✅ |
| | Style | ✅ | ✅ |
| | interactionWidth | ✅ | ✅ |
| **Handles** | Positions (top/right/bottom/left) | ✅ | ✅ |
| | Source/target type | ✅ | ✅ |
| | Multiple handles per node | ✅ | ✅ |
| **Connections** | Drag handle to handle | ✅ | ✅ |
| | Connection validation | ✅ | ✅ |
| | connectionMode (strict/loose) | ✅ | ✅ |
| | Connection line type | ✅ | ✅ |
| | Auto-pan while connecting | ✅ | ✅ |
| **Interactions** | Selection box (drag-select) | ✅ | ✅ |
| | selectionMode (full/partial) | ✅ | ✅ |
| | Multi-select (shift+click) | ✅ | ✅ |
| | Context menu | ✅ | ✅ |
| | Keyboard shortcuts | ✅ | ✅ |
| | Edge click | ✅ | ✅ |
| | Pane click | ✅ | ✅ |
| **Data API** | addNodes/removeNodes | ✅ | ✅ |
| | addEdges/removeEdges | ✅ | ✅ |
| | getNodes/getEdges | ✅ | ✅ |
| | getNode/getEdge | ✅ | ✅ |
| | getIncomers/getOutgoers | ✅ | ✅ |
| | getConnectedEdges | ✅ | ✅ |
| | getNodesBounds | ✅ | ✅ |
| | toObject/fromObject | ✅ | ✅ |
| **Components** | Background (dots/grid/lines) | ✅ | ✅ |
| | Minimap | ✅ | ✅ |
| | Controls (zoom) | ✅ | ✅ |
| | Panel | ✅ | ✅ |
| | NodeResizer | ✅ | ✅ |
| | NodeToolbar | ✅ | ✅ |
| | EdgeLabelRenderer | ✅ | ✅ (foreignObject) |
| | EdgeToolbar | ✅ | ✅ |
| | Layout (auto) | ✅ | ✅ |
| **Advanced** | Undo/Redo | External | ✅ |
| | Copy/Paste | External | ✅ |
| | Smooth viewport animations | ✅ | ✅ |
| | fitViewOptions | ✅ | ✅ |
| | defaultEdgeOptions | ✅ | ✅ |
| | Edge reconnect | reconnectEdge | ✅ |

### 🟡 Partially Implemented

| Feature | React Flow | Hotwire Flow | Gap |
|---------|:----------:|:------------:|-----|
| Parent nodes / sub-flows | ✅ | 🔶 | parentNode, extent:"parent", expandParent |
| Custom edge types | ✅ | 🔶 | Only built-in types; custom edge types via data-attrs |
| onSelectionChange | ✅ | 🔶 | Events fire but no unified hook |

### ❌ Not Yet Implemented

| Feature | React Flow | Priority |
|---------|:----------:|:--------:|
| Nodes/edges change batching | onNodesChange | Low (not needed in Stimulus) |
| Viewport portal | `<ViewportPortal>` | Low |
| Bezier edge curvature control | pathOptions | Low |
| Deletable handles | deletable | Low |
| onEdgeMouseEnter/Leave | events | Low |
| onPaneMouseEnter/Leave | events | Low |
| onMoveStart/End | events | Low |
| useOnSelectionChange hook | hook | Medium |
| useNodesInitialized hook | hook | Low |
| ReactFlowProvider | Not needed | N/A |

## Architecture Differences

| Aspect | React Flow | Hotwire Flow |
|--------|-----------|-------------|
| **Framework** | React only | Any (Stimulus + HTML) |
| **State** | React hooks | Data attributes + Maps |
| **Rendering** | React DOM | Direct DOM manipulation |
| **Node content** | React components | Any HTML |
| **Edge rendering** | SVG via React | SVG via Stimulus controllers |
| **Styling** | CSS/CSS-in-JS | Tailwind CSS classes |
| **Integration** | React only | Rails, Django, Laravel, static HTML |
| **Bundle approach** | NPM + bundler | ESM + CDN (no bundler needed) |
| **Event system** | React props | Custom DOM events + Stimulus dispatch |

## Verdict

**~95% feature parity** with React Flow for core use cases. All major features are implemented:
- Full viewport control (pan, zoom, fit, smooth animations)
- Complete node/edge management (drag, select, connect, resize, delete)
- Professional features (undo/redo, copy/paste, auto-layout, minimap, backgrounds)
- Edge reconnect and advanced interactions

The remaining ~5% consists of:
- React-specific APIs (hooks, providers — not applicable to Stimulus)
- Low-priority edge cases (deletable handles, mouse enter/leave events)
- App-level patterns (batching — not needed in Stimulus architecture)

Hotwire Flow covers all features needed for a production workflow editor, DAG builder, or node-based UI.
