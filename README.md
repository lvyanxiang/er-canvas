# ER Canvas

本地优先、默认只读的 PostgreSQL ER 图可视化桌面工具。

## 当前进度

项目已经完成第一阶段骨架：

- Tauri 2 + React + TypeScript + Vite 桌面应用结构
- PostgreSQL 连接配置表单与受控连接测试命令
- PostgreSQL SSL 模式配置
- Schema 资源树、ER 画布和属性检查器界面框架
- 最小 Tauri Capability 与 CSP 安全配置
- Vitest 前端测试和 Rust 单元测试

产品与技术设计见 [docs/project-proposal.md](docs/project-proposal.md)。

## 开发环境

- Node.js 24.21.0 LTS（项目通过 `.nvmrc` 固定）
- Rust 1.89+
- 当前系统对应的 Tauri 2 前置依赖

```bash
nvm install
nvm use
npm install
npm run tauri dev
```

仅预览前端界面：

```bash
npm run dev
```

## 验证

```bash
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

## 安全边界

前端只能调用注册过的 Tauri Command。当前后端只提供连接测试能力，不暴露任意 SQL 执行接口，也不会把密码写入工作区或日志。
