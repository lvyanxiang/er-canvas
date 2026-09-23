import type { DatabaseSnapshot } from "../../domain/database-model";

interface SchemaExplorerProps {
  snapshot: DatabaseSnapshot | null;
  loading: boolean;
  onRefresh: () => void;
}

export function SchemaExplorer({ snapshot, loading, onRefresh }: SchemaExplorerProps) {
  return (
    <section className="schema-explorer">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SCHEMA</p>
          <h2>资源树</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="刷新 Schema"
          disabled={!snapshot || loading}
          onClick={onRefresh}
        >↻</button>
      </div>
      {loading ? (
        <div className="empty-state compact"><span>◌</span><p>正在读取数据库结构…</p></div>
      ) : snapshot ? (
        <div className="schema-tree">
          {snapshot.schemas.map((schema) => (
            <details key={schema.name} open={schema.name === "public"}>
              <summary>
                <span className="tree-icon schema-icon">◆</span>
                <strong>{schema.name}</strong>
                <span className="tree-count">{schema.tables.length}</span>
              </summary>
              <div className="schema-tables">
                {schema.tables.map((table) => (
                  <div className="tree-table" key={table.id} title={table.comment}>
                    <span className={table.kind.includes("view") ? "view-icon" : "table-icon"}>
                      {table.kind.includes("view") ? "◇" : "▦"}
                    </span>
                    <span>{table.name}</span>
                    <span className="tree-count">{table.columns.length}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <span>⌁</span>
          <p>连接数据库后，将在这里列出 Schema、表和视图。</p>
        </div>
      )}
    </section>
  );
}
