// Auto-layout algorithm — simple hierarchy-based layout (no external deps).
// Similar to Dagre's basic hierarchical layout.
// Supports: vertical (TB), horizontal (LR), with configurable spacing.

/**
 * Compute automatic layout positions for nodes based on edge connections.
 * @param {Array} nodes - [{id, type, position, data}]
 * @param {Array} edges - [{id, source, target}]
 * @param {Object} options - {direction: 'TB'|'LR', nodeSpacing: 80, rankSpacing: 150}
 * @returns {Map} - Map of nodeId -> {x, y}
 */
export function autoLayout(nodes, edges, options = {}) {
  const {
    direction = "TB",  // TB = top-bottom, LR = left-right
    nodeSpacing = 80,
    rankSpacing = 150,
    nodeWidth = 150,
    nodeHeight = 60
  } = options

  if (nodes.length === 0) return new Map()

  // Build adjacency
  const children = new Map()
  const parents = new Map()
  const inDegree = new Map()

  nodes.forEach(n => {
    children.set(n.id, [])
    parents.set(n.id, [])
    inDegree.set(n.id, 0)
  })

  edges.forEach(e => {
    if (children.has(e.source) && parents.has(e.target)) {
      children.get(e.source).push(e.target)
      parents.get(e.target).push(e.source)
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    }
  })

  // Find roots (nodes with no incoming edges)
  const roots = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id)
  if (roots.length === 0) {
    // No clear hierarchy — use first node as root
    roots.push(nodes[0].id)
  }

  // BFS to assign ranks (layers)
  const ranks = new Map()
  const visited = new Set()
  const queue = roots.map(id => ({ id, rank: 0 }))

  while (queue.length > 0) {
    const { id, rank } = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    ranks.set(id, Math.max(ranks.get(id) || 0, rank))

    const kids = children.get(id) || []
    kids.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, rank: rank + 1 })
      }
    })
  }

  // Handle disconnected nodes
  nodes.forEach(n => {
    if (!ranks.has(n.id)) {
      ranks.set(n.id, 0)
    }
  })

  // Group nodes by rank
  const rankGroups = new Map()
  ranks.forEach((rank, id) => {
    if (!rankGroups.has(rank)) rankGroups.set(rank, [])
    rankGroups.get(rank).push(id)
  })

  // Position nodes
  const positions = new Map()
  const maxRank = Math.max(...rankGroups.keys())

  rankGroups.forEach((nodeIds, rank) => {
    const totalWidth = nodeIds.length * (nodeWidth + nodeSpacing) - nodeSpacing
    const startX = -totalWidth / 2

    nodeIds.forEach((id, i) => {
      const x = startX + i * (nodeWidth + nodeSpacing)
      const y = rank * rankSpacing

      if (direction === "TB") {
        positions.set(id, { x, y })
      } else {
        // LR: swap x and y
        positions.set(id, { x: y, y: x })
      }
    })
  })

  // Center around origin
  let minX = Infinity, minY = Infinity
  positions.forEach(pos => {
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
  })
  positions.forEach(pos => {
    pos.x -= minX
    pos.y -= minY
  })

  return positions
}

/**
 * Get connected component groups (for disconnected graphs)
 */
export function getConnectedComponents(nodes, edges) {
  const adj = new Map()
  nodes.forEach(n => adj.set(n.id, new Set()))

  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source).add(e.target)
      adj.get(e.target).add(e.source)
    }
  })

  const visited = new Set()
  const components = []

  nodes.forEach(n => {
    if (visited.has(n.id)) return
    const component = []
    const stack = [n.id]

    while (stack.length > 0) {
      const id = stack.pop()
      if (visited.has(id)) continue
      visited.add(id)
      component.push(id)
      adj.get(id)?.forEach(neighbor => {
        if (!visited.has(neighbor)) stack.push(neighbor)
      })
    }

    components.push(component)
  })

  return components
}
