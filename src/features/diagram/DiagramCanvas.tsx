import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { DatabaseSnapshot, DatabaseTable } from "../../domain/database-model";

interface TableNodeData extends Record<string, unknown> {
  table: DatabaseTable;
}

type TableFlowNode = Node<TableNodeData, "table">;
type LayoutDirection = "RIGHT" | "DOWN";

const elk = new ELK();
const TABLE_WIDTH = 300;
const TABLE_HEADER_HEIGHT = 49;
const COLUMN_HEIGHT = 26;
const TABLE_PADDING = 10;

function tableHeight(table: DatabaseTable) {
  return TABLE_HEADER_HEIGHT + TABLE_PADDING + table.columns.length * COLUMN_HEIGHT;
}

function TableNode({ data }: NodeProps<TableFlowNode>) {
  const { table } = data;
  return (
    <article className="table-node">
      <header>
        <div>
          <span>{table.schema}</span>
          <strong>{table.name}</strong>
        </div>
        {table.kind.includes("view") && <em>VIEW</em>}
      </header>
      <div className="table-columns">
        {table.columns.map((column) => (
          <div className="column-row" key={column.id}>
            <Handle type="target" position={Position.Left} id={column.id} />
            <span className="column-flags">
              {column.primaryKey ? "PK" : column.foreignKey ? "FK" : column.unique ? "UQ" : ""}
            </span>
            <span className="column-name" title={column.comment}>{column.name}</span>
            <span className="column-type" title={column.dataType}>{column.dataType}</span>
            <Handle type="source" position={Position.Right} id={column.id} />
          </div>
        ))}
      </div>
    </article>
  );
}

const nodeTypes = { table: TableNode };

function tablesFrom(snapshot: DatabaseSnapshot) {
  return snapshot.schemas.flatMap((schema) => schema.tables);
}

function createSafeStackNodes(snapshot: DatabaseSnapshot): TableFlowNode[] {
  let nextY = 0;
  return tablesFrom(snapshot).map((table) => {
    const node: TableFlowNode = {
      id: table.id,
      type: "table",
      position: { x: 0, y: nextY },
      data: { table },
    };
    nextY += tableHeight(table) + 80;
    return node;
  });
}

function createEdges(snapshot: DatabaseSnapshot): Edge[] {
  const tables = tablesFrom(snapshot);
  const tableIds = new Set(tables.map((table) => table.id));
  const columnsById = new Map(
    tables.flatMap((table) => table.columns).map((column) => [column.id, column]),
  );
  return snapshot.foreignKeys
    .filter((foreignKey) => (
      tableIds.has(foreignKey.sourceTableId) && tableIds.has(foreignKey.targetTableId)
    ))
    .map((foreignKey) => {
      const sourceColumn = columnsById.get(foreignKey.sourceColumnId);
      const cardinality = sourceColumn?.unique ? "1 : 1" : "N : 1";
      return {
        id: foreignKey.id,
        source: foreignKey.sourceTableId,
        sourceHandle: foreignKey.sourceColumnId,
        target: foreignKey.targetTableId,
        targetHandle: foreignKey.targetColumnId,
        type: "smoothstep",
        pathOptions: { borderRadius: 4, offset: 28 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13 },
        style: { stroke: "#67dbae", strokeWidth: 1.35 },
        label: cardinality,
        ariaLabel: `${foreignKey.name}，${cardinality}`,
        data: { relationship: foreignKey },
        labelStyle: { fill: "#a7b6c9", fontSize: 9, fontWeight: 600 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: "#101925", fillOpacity: 0.96, stroke: "#2c4155" },
      };
    });
}

async function createElkNodes(
  snapshot: DatabaseSnapshot,
  direction: LayoutDirection,
): Promise<TableFlowNode[]> {
  const tables = tablesFrom(snapshot);
  const tableIds = new Set(tables.map((table) => table.id));
  const graph = await elk.layout({
    id: "er-canvas-root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "90",
      "elk.spacing.componentComponent": "140",
      "elk.layered.spacing.nodeNodeBetweenLayers": "180",
      "elk.layered.spacing.edgeNodeBetweenLayers": "45",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: tables.map((table) => ({
      id: table.id,
      width: TABLE_WIDTH,
      height: tableHeight(table),
    })),
    edges: snapshot.foreignKeys
      .filter((foreignKey) => (
        tableIds.has(foreignKey.sourceTableId) && tableIds.has(foreignKey.targetTableId)
      ))
      .map((foreignKey) => ({
        id: foreignKey.id,
        sources: [foreignKey.sourceTableId],
        targets: [foreignKey.targetTableId],
      })),
  });

  const positions = new Map(
    graph.children?.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]),
  );
  return tables.map((table) => ({
    id: table.id,
    type: "table",
    position: positions.get(table.id) ?? { x: 0, y: 0 },
    data: { table },
  }));
}

interface DiagramCanvasProps {
  snapshot: DatabaseSnapshot | null;
  loading: boolean;
}

export function DiagramCanvas({ snapshot, loading }: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([]);
  const [direction, setDirection] = useState<LayoutDirection>("RIGHT");
  const [layouting, setLayouting] = useState(false);
  const flowInstance = useRef<ReactFlowInstance<TableFlowNode, Edge> | null>(null);
  const edges = useMemo(() => snapshot ? createEdges(snapshot) : [], [snapshot]);

  const fitDiagram = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void flowInstance.current?.fitView({ padding: 0.12, duration: 450 });
      });
    });
  }, []);

  const runLayout = useCallback(async (
    currentSnapshot: DatabaseSnapshot,
    nextDirection: LayoutDirection,
  ) => {
    setLayouting(true);
    try {
      setNodes(await createElkNodes(currentSnapshot, nextDirection));
      fitDiagram();
    } catch (error) {
      console.error("ELK layout failed", error);
      setNodes(createSafeStackNodes(currentSnapshot));
      fitDiagram();
    } finally {
      setLayouting(false);
    }
  }, [fitDiagram, setNodes]);

  useEffect(() => {
    if (!snapshot) {
      setNodes([]);
      return;
    }
    setNodes(createSafeStackNodes(snapshot));
    void runLayout(snapshot, direction);
  }, [snapshot, direction, runLayout, setNodes]);

  if (!snapshot) {
    return (
      <section className="canvas" aria-label="ER 图画布">
        <div className="welcome-card">
          <span className="welcome-icon">⌘</span>
          <p className="eyebrow">{loading ? "LOADING SCHEMA" : "START MAPPING"}</p>
          <h1>{loading ? "正在生成真实 ER 图" : "让数据库结构一目了然"}</h1>
          <p>{loading ? "正在读取表、字段、约束和外键关系。" : "连接 PostgreSQL，ER Canvas 会生成可交互的关系图。"}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="canvas flow-canvas" aria-label="ER 图画布">
      <div className="canvas-toolbar layout-toolbar">
        <select
          aria-label="布局方向"
          value={direction}
          onChange={(event) => setDirection(event.target.value as LayoutDirection)}
        >
          <option value="RIGHT">从左到右</option>
          <option value="DOWN">从上到下</option>
        </select>
        <button
          type="button"
          disabled={layouting}
          onClick={() => void runLayout(snapshot, direction)}
        >
          {layouting ? "布局中…" : "自动布局"}
        </button>
        <button type="button" onClick={fitDiagram}>适应画布</button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onInit={(instance) => { flowInstance.current = instance; }}
        minZoom={0.05}
        maxZoom={1.8}
        nodesDraggable={!layouting}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background color="#2a3a50" gap={22} size={1} />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          nodeColor="#284c40"
          maskColor="rgba(6, 12, 20, .72)"
        />
      </ReactFlow>
      {layouting && <div className="layout-progress">正在优化节点与关系线…</div>}
    </section>
  );
}
