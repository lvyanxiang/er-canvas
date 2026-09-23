import { CanvasPlaceholder } from "../features/diagram/CanvasPlaceholder";
import { ConnectionPanel } from "../features/connections/ConnectionPanel";
import { SchemaExplorer } from "../features/schema-explorer/SchemaExplorer";

export function App() {
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
          <ConnectionPanel />
          <SchemaExplorer />
        </aside>
        <CanvasPlaceholder />
        <aside className="inspector">
          <p className="eyebrow">INSPECTOR</p>
          <h2>选择画布对象</h2>
          <p>表、字段和关系的详细信息会显示在这里。</p>
        </aside>
      </section>

      <footer className="statusbar">
        <span>未连接</span>
        <span>0 张表 · 0 条关系</span>
        <span>100%</span>
      </footer>
    </main>
  );
}
