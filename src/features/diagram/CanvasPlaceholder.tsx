export function CanvasPlaceholder() {
  return (
    <section className="canvas" aria-label="ER 图画布">
      <div className="canvas-toolbar">
        <button type="button">⌕ 搜索</button>
        <button type="button">自动布局</button>
        <button type="button">适应画布</button>
      </div>
      <div className="welcome-card">
        <span className="welcome-icon">⌘</span>
        <p className="eyebrow">START MAPPING</p>
        <h1>让数据库结构一目了然</h1>
        <p>连接 PostgreSQL，选择 Schema，ER Canvas 会生成一张可编辑、可保存的关系图。</p>
        <ol>
          <li><span>01</span>填写只读连接</li>
          <li><span>02</span>选择目标 Schema</li>
          <li><span>03</span>生成 ER 图</li>
        </ol>
      </div>
      <div className="zoom-controls" aria-label="缩放控制">
        <button type="button" aria-label="缩小">−</button>
        <span>100%</span>
        <button type="button" aria-label="放大">＋</button>
      </div>
    </section>
  );
}
