import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { DatabaseSnapshot, DatabaseTable } from "../../domain/database-model";

interface TableNodeData extends Record<string, unknown> {
  table: DatabaseTable;
}

type TableFlowNode = Node<TableNodeData, "table">;

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
            <span className="column-name">{column.name}</span>
            <span className="column-type">{column.dataType}</span>
            <Handle type="source" position={Position.Right} id={column.id} />
          </div>
        ))}
      </div>
    </article>
  );
}

const nodeTypes = { table: TableNode };

function createNodes(snapshot: DatabaseSnapshot): TableFlowNode[] {
  const tables = snapshot.schemas.flatMap((schema) => schema.tables);
  const columnCount = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
  return tables.map((table, index) => ({
    id: table.id,
    type: "table",
    position: {
      x: (index % columnCount) * 360,
      y: Math.floor(index / columnCount) * 440,
    },
    data: { table },
  }));
}

function createEdges(snapshot: DatabaseSnapshot): Edge[] {
  return snapshot.foreignKeys.map((foreignKey) => ({
    id: foreignKey.id,
    source: foreignKey.sourceTableId,
    sourceHandle: foreignKey.sourceColumnId,
    target: foreignKey.targetTableId,
    targetHandle: foreignKey.targetColumnId,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    style: { stroke: "#67dbae", strokeWidth: 1.4 },
    label: foreignKey.name,
    labelStyle: { fill: "#90a0b5", fontSize: 9 },
  }));
}

interface DiagramCanvasProps {
  snapshot: DatabaseSnapshot | null;
  loading: boolean;
}

export function DiagramCanvas({ snapshot, loading }: DiagramCanvasProps) {
  const nodes = useMemo(() => snapshot ? createNodes(snapshot) : [], [snapshot]);
  const edges = useMemo(() => snapshot ? createEdges(snapshot) : [], [snapshot]);

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.08}
        maxZoom={1.8}
        nodesDraggable
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
    </section>
  );
}
