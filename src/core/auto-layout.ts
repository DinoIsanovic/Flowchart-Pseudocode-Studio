/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowEdge, FlowNode } from '../types';

export interface LayoutResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const GRID_SIZE = 32;
const HORIZONTAL_GAP = 64;
const VERTICAL_GAP = 64;
const COMPONENT_GAP = 128;
const TARGET_CENTER_X = 400;
const TARGET_START_Y = 120;

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

/**
 * Auto-layouts nodes and edges into a clean, hierarchical top-down flowchart.
 * Breaks cycles safely (for loops), layers nodes in sequence/branches,
 * aligns sibling branches neatly, and centers the entire diagram.
 */
export function autoLayoutFlowchart(nodes: FlowNode[], edges: FlowEdge[]): LayoutResult {
  if (!nodes.length) {
    return { nodes, edges };
  }

  // 1. Separate regular flowchart nodes from comments
  const regularNodes = nodes.filter((n) => n.type !== 'comment');
  const commentNodes = nodes.filter((n) => n.type === 'comment');

  if (!regularNodes.length) {
    // Only comments exist, stack them neatly
    const laidOutComments = commentNodes.map((n, idx) => ({
      ...n,
      x: TARGET_CENTER_X,
      y: snapToGrid(TARGET_START_Y + idx * (n.h + 32)),
    }));
    return { nodes: laidOutComments, edges };
  }

  // Map for fast node lookup
  const nodeMap = new Map<string, FlowNode>();
  regularNodes.forEach((n) => nodeMap.set(n.id, { ...n }));

  // Adjacency lists
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  regularNodes.forEach((n) => {
    outEdges.set(n.id, []);
    inEdges.set(n.id, []);
  });

  edges.forEach((e) => {
    if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
      outEdges.get(e.from)!.push(e.to);
      inEdges.get(e.to)!.push(e.from);
    }
  });

  // 2. Identify Connected Components
  const visited = new Set<string>();
  const components: string[][] = [];

  regularNodes.forEach((n) => {
    if (!visited.has(n.id)) {
      const comp: string[] = [];
      const queue = [n.id];
      visited.add(n.id);

      while (queue.length > 0) {
        const cur = queue.shift()!;
        comp.push(cur);

        const neighbors = [
          ...(outEdges.get(cur) || []),
          ...(inEdges.get(cur) || []),
        ];

        neighbors.forEach((nbr) => {
          if (!visited.has(nbr) && nodeMap.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        });
      }
      components.push(comp);
    }
  });

  // 3. Layout each connected component individually
  let componentStartX = TARGET_CENTER_X;
  const laidOutNodes: FlowNode[] = [];

  components.forEach((compNodeIds) => {
    const compNodes = compNodeIds.map((id) => nodeMap.get(id)!);

    // Find root nodes within component
    // Prioritize start_end with "start" or "početak", then nodes with in-degree 0
    let roots = compNodes.filter((n) => (inEdges.get(n.id)?.length || 0) === 0);

    if (!roots.length) {
      // If cycle with no 0-in-degree node, pick start_end or node with lowest in-degree
      const startEnd = compNodes.find((n) => n.type === 'start_end');
      if (startEnd) {
        roots = [startEnd];
      } else {
        const sortedByInDegree = [...compNodes].sort(
          (a, b) => (inEdges.get(a.id)?.length || 0) - (inEdges.get(b.id)?.length || 0)
        );
        roots = [sortedByInDegree[0]];
      }
    } else {
      // Put start_end first among roots if present
      roots.sort((a, b) => {
        if (a.type === 'start_end') return -1;
        if (b.type === 'start_end') return 1;
        return 0;
      });
    }

    // Detect back-edges using DFS from roots to break cycles (loops)
    const dfsVisited = new Set<string>();
    const recStack = new Set<string>();
    const backEdgeSet = new Set<string>(); // "from->to"

    function detectBackEdges(u: string) {
      dfsVisited.add(u);
      recStack.add(u);

      const targets = outEdges.get(u) || [];
      for (const v of targets) {
        if (!dfsVisited.has(v)) {
          detectBackEdges(v);
        } else if (recStack.has(v)) {
          backEdgeSet.add(`${u}->${v}`);
        }
      }

      recStack.delete(u);
    }

    roots.forEach((r) => {
      if (!dfsVisited.has(r.id)) {
        detectBackEdges(r.id);
      }
    });
    // If any node wasn't reached by roots, run on remaining
    compNodes.forEach((n) => {
      if (!dfsVisited.has(n.id)) {
        detectBackEdges(n.id);
      }
    });

    // 4. Assign Layers (Ranks) using forward edges
    const layer = new Map<string, number>();
    roots.forEach((r) => layer.set(r.id, 0));

    // Iterative relaxation for DAG longest-path layering
    let changed = true;
    let iterations = 0;
    const maxIterations = compNodes.length * 2;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      compNodes.forEach((uNode) => {
        const u = uNode.id;
        const uLayer = layer.get(u);
        if (uLayer === undefined) return;

        const targets = outEdges.get(u) || [];
        targets.forEach((v) => {
          if (backEdgeSet.has(`${u}->${v}`)) return; // skip loop back-edges

          const vLayer = layer.get(v);
          const nextLayer = uLayer + 1;
          if (vLayer === undefined || nextLayer > vLayer) {
            layer.set(v, nextLayer);
            changed = true;
          }
        });
      });
    }

    // Any unassigned nodes in component get placed after max layer
    let maxAssigned = 0;
    layer.forEach((lvl) => {
      if (lvl > maxAssigned) maxAssigned = lvl;
    });

    compNodes.forEach((n) => {
      if (!layer.has(n.id)) {
        maxAssigned += 1;
        layer.set(n.id, maxAssigned);
      }
    });

    // Group nodes by layer
    const layersMap = new Map<number, FlowNode[]>();
    compNodes.forEach((n) => {
      const l = layer.get(n.id)!;
      if (!layersMap.has(l)) layersMap.set(l, []);
      layersMap.get(l)!.push(n);
    });

    const sortedLayerLevels = Array.from(layersMap.keys()).sort((a, b) => a - b);

    // 5. Position nodes per layer
    let currentY = TARGET_START_Y;
    const compLaidOut: FlowNode[] = [];

    sortedLayerLevels.forEach((lvl) => {
      const levelNodes = layersMap.get(lvl)!;

      // Sort nodes within level:
      // If nodes have incoming edges, sort by average X of their parents from earlier levels
      levelNodes.sort((a, b) => {
        const parentsA = inEdges.get(a.id) || [];
        const parentsB = inEdges.get(b.id) || [];

        const avgXA = parentsA.length
          ? parentsA.reduce((sum, pId) => sum + (nodeMap.get(pId)?.x || 0), 0) / parentsA.length
          : a.x;
        const avgXB = parentsB.length
          ? parentsB.reduce((sum, pId) => sum + (nodeMap.get(pId)?.x || 0), 0) / parentsB.length
          : b.x;

        return avgXA - avgXB;
      });

      // Calculate total width of this level
      const totalWidth =
        levelNodes.reduce((sum, n) => sum + n.w, 0) +
        (levelNodes.length - 1) * HORIZONTAL_GAP;

      // Center the level horizontally around componentStartX
      let currentX = componentStartX - totalWidth / 2;

      const levelMaxH = Math.max(...levelNodes.map((n) => n.h));

      levelNodes.forEach((n) => {
        const nodeX = snapToGrid(currentX + n.w / 2);
        const nodeY = snapToGrid(currentY + levelMaxH / 2);

        n.x = nodeX;
        n.y = nodeY;
        nodeMap.set(n.id, n);
        compLaidOut.push(n);

        currentX += n.w + HORIZONTAL_GAP;
      });

      currentY += levelMaxH + VERTICAL_GAP;
    });

    // Compute width of this component to shift next component
    let compMinX = Infinity;
    let compMaxX = -Infinity;
    compLaidOut.forEach((n) => {
      compMinX = Math.min(compMinX, n.x - n.w / 2);
      compMaxX = Math.max(compMaxX, n.x + n.w / 2);
    });
    const compWidth = compMaxX - compMinX;
    componentStartX += compWidth + COMPONENT_GAP;

    laidOutNodes.push(...compLaidOut);
  });

  // 6. Position comment nodes to the right of the flowchart
  let overallMaxX = -Infinity;
  let overallMinY = Infinity;
  laidOutNodes.forEach((n) => {
    overallMaxX = Math.max(overallMaxX, n.x + n.w / 2);
    overallMinY = Math.min(overallMinY, n.y - n.h / 2);
  });

  if (commentNodes.length) {
    const commentX = snapToGrid(overallMaxX + 96 + 90);
    let commentY = snapToGrid(Math.max(TARGET_START_Y, overallMinY));

    commentNodes.forEach((cn) => {
      cn.x = commentX;
      cn.y = snapToGrid(commentY + cn.h / 2);
      commentY += cn.h + 32;
      laidOutNodes.push(cn);
    });
  }

  // 7. Center all nodes as a collective unit around (400, targetCy)
  let totalMinX = Infinity;
  let totalMaxX = -Infinity;
  let totalMinY = Infinity;
  let totalMaxY = -Infinity;

  laidOutNodes.forEach((n) => {
    totalMinX = Math.min(totalMinX, n.x - n.w / 2);
    totalMaxX = Math.max(totalMaxX, n.x + n.w / 2);
    totalMinY = Math.min(totalMinY, n.y - n.h / 2);
    totalMaxY = Math.max(totalMaxY, n.y + n.h / 2);
  });

  const currentMidX = (totalMinX + totalMaxX) / 2;
  const offsetX = snapToGrid(TARGET_CENTER_X - currentMidX);
  const offsetY = snapToGrid(TARGET_START_Y - totalMinY);

  const finalNodes = laidOutNodes.map((n) => ({
    ...n,
    x: n.x + offsetX,
    y: n.y + offsetY,
  }));

  // 8. Straighten and clean edges (reset waypoints so orthogonal routing adjusts cleanly)
  const finalEdges = edges.map((e) => ({
    ...e,
    waypoints: undefined,
    baseWaypoints: undefined,
  }));

  return {
    nodes: finalNodes,
    edges: finalEdges,
  };
}

/**
 * Centers all nodes on the canvas around the target coordinate (default 400, 300)
 * preserving their existing relative layout, and snaps them to grid.
 */
export function centerNodesOnCanvas(nodes: FlowNode[], edges: FlowEdge[]): LayoutResult {
  if (!nodes.length) {
    return { nodes, edges };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    minX = Math.min(minX, n.x - n.w / 2);
    maxX = Math.max(maxX, n.x + n.w / 2);
    minY = Math.min(minY, n.y - n.h / 2);
    maxY = Math.max(maxY, n.y + n.h / 2);
  });

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const currentCx = minX + contentW / 2;
  const currentCy = minY + contentH / 2;

  const targetCx = 400;
  const targetCy = Math.max(TARGET_START_Y + contentH / 2, 280);

  const shiftX = snapToGrid(targetCx - currentCx);
  const shiftY = snapToGrid(targetCy - currentCy);

  const shiftedNodes = nodes.map((n) => ({
    ...n,
    x: snapToGrid(n.x + shiftX),
    y: snapToGrid(n.y + shiftY),
  }));

  // Also shift waypoints on edges if any
  const shiftedEdges = edges.map((e) => {
    if (!e.waypoints?.length) return e;
    return {
      ...e,
      waypoints: e.waypoints.map((wp) => ({
        ...wp,
        v: wp.axis === 'x' ? snapToGrid(wp.v + shiftX) : snapToGrid(wp.v + shiftY),
      })),
    };
  });

  return {
    nodes: shiftedNodes,
    edges: shiftedEdges,
  };
}
