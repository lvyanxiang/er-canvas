import { useState } from "react";
import { DiagramCanvas } from "../features/diagram/DiagramCanvas";
import { ConnectionPanel } from "../features/connections/ConnectionPanel";
import { SchemaExplorer } from "../features/schema-explorer/SchemaExplorer";
import type { ConnectionDraft, ConnectionTestResult } from "../features/connections/types";
import type { DatabaseSnapshot } from "../domain/database-model";
import { introspectDatabase } from "../services/tauri";

export function App() {
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null);
  const [activeConnection, setActiveConnection] = useState<ConnectionDraft | null>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadSnapshot(connection: ConnectionDraft) {
    setLoading(true);
    try {
      setSnapshot(await introspectDatabase(connection));
    } finally {
      setLoading(false);
    }
  }

  async function handleConnected(connection: ConnectionDraft, result: ConnectionTestResult) {
    setActiveConnection(connection);
    setConnectionResult(result);
    await loadSnapshot(connection);
  }

  const tableCount = snapshot?.schemas.reduce((count, schema) => count + schema.tables.length, 0) ?? 0;
  const relationshipCount = snapshot?.foreignKeys.length ?? 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">ER</span>
          <div>
            <strong>ER Canvas</strong>
            <span>PostgreSQL structure, clearly mapped</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="read-only-badge">READ ONLY</span>
          <button className="ghost-button" type="button">导出</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <ConnectionPanel onConnected={handleConnected} />
          <SchemaExplorer
            snapshot={snapshot}
            loading={loading}
            onRefresh={() => activeConnection && void loadSnapshot(activeConnection)}
          />
        </aside>
        <DiagramCanvas snapshot={snapshot} loading={loading} />
        <aside className="inspector">
          <p className="eyebrow">INSPECTOR</p>
          <h2>选择画布对象</h2>
          <p>表、字段和关系的详细信息会显示在这里。</p>
        </aside>
      </section>

      <footer className="statusbar">
        <span>{connectionResult ? `PostgreSQL ${connectionResult.serverVersion}` : "未连接"}</span>
        <span>{tableCount} 张表 · {relationshipCount} 条关系</span>
        <span>100%</span>
      </footer>
    </main>
  );
}
