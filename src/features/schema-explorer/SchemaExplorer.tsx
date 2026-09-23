export function SchemaExplorer() {
  return (
    <section className="schema-explorer">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SCHEMA</p>
          <h2>资源树</h2>
        </div>
        <button className="icon-button" type="button" aria-label="刷新 Schema">↻</button>
      </div>
      <div className="empty-state compact">
        <span>⌁</span>
        <p>连接数据库后，将在这里列出 Schema、表和视图。</p>
      </div>
    </section>
  );
}
