import { FormEvent, useState } from "react";
import { formatCommandError, isTauriRuntime, testConnection } from "../../services/tauri";
import type { ConnectionDraft } from "./types";

const initialConnection: ConnectionDraft = {
  host: "localhost",
  port: 5432,
  database: "postgres",
  username: "postgres",
  password: "",
  sslMode: "prefer",
};

export function ConnectionPanel() {
  const [connection, setConnection] = useState(initialConnection);
  const [status, setStatus] = useState("填写连接信息后进行测试");
  const [testing, setTesting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isTauriRuntime()) {
      setStatus("浏览器预览不会连接数据库，请使用 npm run tauri dev");
      return;
    }

    setTesting(true);
    setStatus("正在安全测试连接…");
    try {
      const result = await testConnection(connection);
      setStatus(`连接成功 · PostgreSQL ${result.serverVersion} · ${result.latencyMs} ms`);
    } catch (error) {
      setStatus(formatCommandError(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="connection-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONNECTION</p>
          <h2>PostgreSQL</h2>
        </div>
        <span className="status-dot" aria-label="未连接" />
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          主机
          <input
            aria-label="主机"
            value={connection.host}
            onChange={(event) => setConnection({ ...connection, host: event.target.value })}
          />
        </label>
        <div className="field-row">
          <label>
            端口
            <input
              aria-label="端口"
              type="number"
              min="1"
              max="65535"
              value={connection.port}
              onChange={(event) => setConnection({ ...connection, port: Number(event.target.value) })}
            />
          </label>
          <label>
            SSL
            <select
              aria-label="SSL 模式"
              value={connection.sslMode}
              onChange={(event) => setConnection({
                ...connection,
                sslMode: event.target.value as ConnectionDraft["sslMode"],
              })}
            >
              <option value="disable">disable</option>
              <option value="prefer">prefer</option>
              <option value="require">require</option>
              <option value="verify-ca">verify-ca</option>
              <option value="verify-full">verify-full</option>
            </select>
          </label>
        </div>
        <label>
          数据库
          <input
            aria-label="数据库"
            value={connection.database}
            onChange={(event) => setConnection({ ...connection, database: event.target.value })}
          />
        </label>
        <label>
          用户名
          <input
            aria-label="用户名"
            autoComplete="username"
            value={connection.username}
            onChange={(event) => setConnection({ ...connection, username: event.target.value })}
          />
        </label>
        <label>
          密码
          <input
            aria-label="密码"
            type="password"
            autoComplete="current-password"
            value={connection.password}
            onChange={(event) => setConnection({ ...connection, password: event.target.value })}
          />
        </label>
        <button className="primary-button" disabled={testing} type="submit">
          {testing ? "测试中…" : "测试连接"}
        </button>
        <p className="connection-status" aria-live="polite">{status}</p>
      </form>
    </section>
  );
}
