# ER Canvas 项目立项与产品技术设计文档

> 文档状态：Draft v1.0  
> 项目代号：ER Canvas（正式名称立项后确定）  
> 目标平台：macOS 优先，兼容 Windows；Linux 作为后续支持  
> 首期数据库：PostgreSQL  
> 项目性质：个人使用优先，可演进为团队内部工具  
> 参考产品：Navicat ER Diagram / Navicat Data Modeler  

---

## 1. 项目摘要

ER Canvas 是一个本地桌面数据库结构可视化工具。用户连接 PostgreSQL 后，应用读取数据库元数据，在无限画布中生成清晰、美观、可交互的 ER 图，并支持保存布局、搜索、筛选、手工补充逻辑关系以及导出图片。

第一阶段不开发完整数据库客户端，也不尝试复刻 Navicat 的 SQL 编辑、数据编辑、导入导出等全部功能。产品聚焦一个目标：

> 比通用数据库客户端更直观地展示和维护数据库实体关系，同时确保默认只读、不会误改真实数据库。

产品应达到以下体验：

1. 连接 PostgreSQL 后，一次操作生成完整 ER 图。
2. 表节点、字段、主外键、唯一约束和关系线清晰可读。
3. 支持拖动、缩放、平移、多选、对齐、自动布局和小地图。
4. 支持添加“逻辑关系”，弥补数据库中没有真实外键的业务关联。
5. 自动保存用户调整后的布局，下次打开保持原样。
6. 支持导出 PNG、SVG，供 README、设计评审和技术文档使用。

---

## 2. 背景与问题

现有数据库工具通常存在以下问题：

- Navicat 的 ER 图体验成熟，但属于商业软件。
- DBeaver 可以自动生成 ER 图，但视觉和复杂 Schema 下的布局体验一般。
- 在线 ER 工具图形美观，但需要手工维护，无法始终反映真实数据库。
- 自动生成工具只能识别数据库外键，无法识别代码中的逻辑关联。
- 大型 Schema 中线条交叉严重，难以用于新人理解业务。
- 数据库客户端通常把“查数据、改数据、设计表、画图”混在一起，误操作风险较高。

以当前 eSIM 项目为例，数据库中既有真实外键：

```text
orders.userId               -> users.id
orders.productId            -> esim_products.productId
payments.orderId            -> orders.id
esim_profiles.orderId       -> orders.id
usage_records.esimProfileId -> esim_profiles.id
```

也有数据库无法自动识别的逻辑关系：

```text
transaction_sagas.orderId      -> orders.id
product_prices.productId       -> esim_products.productId
esim_inventory.profileId       -> esim_profiles.id
esim_inventory.assignedOrderId -> orders.id
cmi_webhook_events.profileId   -> esim_profiles.id
```

因此，只依靠数据库自动反向工程无法生成完整的业务关系图。

---

## 3. 项目目标

### 3.1 核心目标

- 提供接近 Navicat ER Diagram 的视觉效果和画布操作体验。
- 从 PostgreSQL 自动反向工程表、字段、约束、索引和外键。
- 将真实数据库关系与手工逻辑关系同时展示。
- 默认只读，确保不会因为查看模型而修改数据库。
- 所有连接信息、布局和模型文件保存在本地。
- 适合 20～300 张表规模的日常项目。

### 3.2 成功指标

- 新用户可以在 3 分钟内完成连接并生成第一张 ER 图。
- 对 100 张表的 Schema，首次布局在普通开发机上 5 秒内完成，不包含网络连接耗时。
- 常见缩放、平移、拖动操作保持流畅，无明显卡顿。
- 数据库中存在的主键、外键和唯一约束识别正确率达到 100%。
- 保存后重新打开，节点位置和手工关系完整恢复。
- 当前 eSIM 测试库完整迁移后，应识别 20 张表和 9 条真实外键关系。
- 能手工补充并保存当前项目至少 5 条逻辑关系。

### 3.3 非目标

首期明确不开发：

- 数据行浏览和编辑。
- SQL IDE、自动补全和执行计划。
- 数据库备份、恢复、迁移。
- 从画布直接修改生产数据库。
- MySQL、SQL Server、Oracle、SQLite 等多数据库适配。
- 多人实时协作和云同步。
- AI 自动生成或修改数据库。
- 完整复制 Navicat 的品牌、图标、素材和代码实现。

---

## 4. 产品定位与原则

### 4.1 产品定位

```text
数据库真实结构查看器
        +
可维护的 ER 图编辑器
        +
轻量级数据库结构文档工具
```

### 4.2 设计原则

1. **真实结构优先**：真实外键来自数据库元数据，不允许手工覆盖成错误结果。
2. **默认只读**：任何可能改变数据库的能力都不进入首期。
3. **区分关系来源**：真实外键和逻辑关系在视觉与数据模型中必须区分。
4. **渐进展示**：默认只展示理解关系所需的信息，详细属性放到侧边栏。
5. **本地优先**：无账号、无云端依赖、无数据上传。
6. **安全失败**：连接失败、权限不足或元数据不完整时给出明确原因，不静默忽略。
7. **功能对标而非品牌复制**：参考成熟交互，不使用 Navicat 商标、图标和专有素材。

---

## 5. 用户与使用场景

### 5.1 目标用户

- 新加入项目、需要快速理解数据模型的开发者。
- 需要排查表关系的后端工程师。
- 需要确认真实外键的数据库管理员。
- 需要制作技术文档和评审图的架构师。
- 希望维护逻辑关系但不想修改数据库的个人开发者。

### 5.2 典型场景

#### 场景 A：理解陌生项目

用户连接开发数据库，生成完整 ER 图，搜索 `orders`，选择“显示直接关联”，查看用户、商品、支付和 eSIM Profile 的关系。

#### 场景 B：补充逻辑关联

用户发现 `transaction_sagas.orderId` 没有数据库外键，通过拖动字段创建一条“逻辑关系”，添加说明并保存到工作区。

#### 场景 C：数据库变更后刷新

执行 Migration 后，用户点击“刷新结构”。应用显示新增、删除、修改对象的差异摘要，并尽可能保留已有布局。

#### 场景 D：输出项目文档

用户隐藏无关表，只保留交易域，自动排列后导出 SVG，用于 README 或方案评审。

---

## 6. 功能范围与优先级

### 6.1 P0：最小可用版本

#### 连接管理

- 新建、编辑、删除 PostgreSQL 连接。
- 支持 Host、Port、Database、Username、Password。
- 支持 SSL Mode：disable、prefer、require、verify-ca、verify-full。
- 测试连接。
- 选择目标 Schema。
- 密码可选择不保存或保存到系统密钥链。
- 显示只读账号建议。

#### 元数据反向工程

- Schema、表、字段。
- 字段类型、长度、精度、默认值、是否可空。
- 主键、外键、唯一约束。
- 普通索引、唯一索引。
- 表和字段注释。
- 外键 `ON DELETE`、`ON UPDATE`。
- 数据库视图以只读节点显示。

#### ER 图画布

- 表节点、字段行、关系线。
- 拖动节点。
- 鼠标滚轮/触控板缩放。
- 空白区域拖动画布。
- 框选、多选、Shift/Cmd 追加选择。
- 自动适应画布。
- 小地图。
- 自动布局。
- 撤销/重做。
- 显示/隐藏字段类型。
- 折叠/展开表节点。
- 搜索并定位表。
- 只显示选中表的直接关联。

#### 布局持久化

- 自动保存节点位置、尺寸、折叠状态和视口。
- 工作区重新打开后恢复布局。
- 数据库刷新后按稳定 ID 匹配旧节点并保留位置。
- 对新增表单独放入“待布局区”，不打乱全图。

#### 逻辑关系

- 从源字段拖动到目标字段创建关系。
- 关系类型：一对一、一对多、多对多、未知。
- 可填写名称、说明、来源。
- 可修改线型、颜色分类和显示标签。
- 逻辑关系不写入数据库。
- 真实外键不可被当作逻辑关系删除。

#### 导出

- 导出 PNG。
- 导出 SVG。
- 导出当前可视区域或完整画布。
- 可选透明背景、浅色背景、深色背景。

### 6.2 P1：增强版本

- 表分组与图层。
- 便签、文本标签和矩形区域。
- 对齐参考线和吸附。
- 水平/垂直对齐、等距分布。
- 锁定节点和锁定图层。
- Crow's Foot、IDEF1X、UML 三种表示法。
- 导入 PostgreSQL DDL 文件生成离线模型。
- 导出结构数据字典 Markdown/HTML。
- Schema 刷新差异预览。
- 关系路径查询：寻找表 A 到表 B 的关联路径。
- 主题切换：浅色、深色、跟随系统。
- 多 Diagram：一个工作区保存多张业务子图。
- 快捷复制表名、字段名和建表 SQL。

### 6.3 P2：谨慎评估

- 模型与数据库结构对比。
- 从模型生成 DDL。
- 正向同步数据库。
- 多数据库支持。
- 团队协作。
- 插件系统。

P2 中涉及写数据库的功能必须经过单独安全评审，并默认只生成 SQL 预览，不允许直接执行。

---

## 7. 界面信息架构

### 7.1 主窗口布局

```text
+------------------------------------------------------------------+
| 菜单栏 / 工具栏：连接、刷新、搜索、布局、导出、撤销、重做       |
+------------------+--------------------------------+--------------+
| 左侧资源树       | 中央 ER 无限画布               | 右侧检查器   |
|                  |                                |              |
| 连接             | 表节点                         | 表属性       |
|  └ 数据库        | 字段                           | 字段属性     |
|     └ Schema     | 外键连线                       | 关系属性     |
|        ├ 表      | 逻辑关系                       | 样式/说明    |
|        └ 视图    | 分组/便签                      |              |
+------------------+--------------------------------+--------------+
| 状态栏：缩放、对象数量、关系数量、连接状态、最后刷新时间         |
+------------------------------------------------------------------+
```

### 7.2 左侧资源树

- 支持按名称过滤。
- 表、视图使用不同图标。
- 展开表后显示 Columns、Keys、Indexes。
- 拖动表到画布。
- 双击表：画布定位并选中。
- 右键菜单：添加到当前 Diagram、仅显示关联、复制名称、刷新。

### 7.3 中央画布

- 无限画布背景，可选择点阵或网格。
- 空白处右键菜单：新建便签、粘贴、自动布局、适应画布。
- 支持多 Diagram 标签页。
- 关系线默认使用正交折线，尽量减少穿过节点。
- 缩放较小时隐藏字段细节，只显示表名和关系。

### 7.4 右侧检查器

根据当前选择显示：

- 表：名称、Schema、注释、类型、字段数、索引数。
- 字段：类型、可空、默认值、注释、约束。
- 关系：源表/字段、目标表/字段、基数、来源、更新删除规则。
- 多选：对齐、分布、锁定、批量显示设置。

---

## 8. 视觉设计规范

### 8.1 表节点结构

```text
+-----------------------------------+
| orders                       [－] |
+-----------------------------------+
| PK  id                 uuid       |
| FK  userId             uuid       |
| FK  productId          integer    |
|     status              enum       |
|     totalAmount         numeric    |
|     createdAt           timestamp  |
+-----------------------------------+
```

节点组成：

- 标题栏：Schema 可选、表名、折叠按钮。
- 字段栏：约束图标、字段名、数据类型、可空标识。
- 状态：默认、悬停、选中、多选、锁定、搜索命中。
- 表头颜色用于区分业务分组，不用于区分每一张表。
- 节点宽度可拖动；字段名和类型过长时省略并提供 Tooltip。

### 8.2 字段标识

| 标识 | 含义 |
|---|---|
| PK | 主键 |
| FK | 外键 |
| UQ | 唯一约束 |
| IX | 普通索引 |
| NN | NOT NULL |
| DF | 存在默认值 |

同一字段可同时存在多个标识。图标必须配合 Tooltip，不允许仅靠颜色表达含义。

### 8.3 关系线

- 默认采用 Crow's Foot 基数符号。
- 真实外键：实线。
- 手工逻辑关系：虚线。
- 选中关系：提高对比度并显示端点与折点。
- 支持添加、删除和拖动折点。
- 关系标签默认隐藏，选中或放大后显示。
- 多条关系连接同一对表时按字段分别连线，不合并为一条模糊关系。

### 8.4 视觉原创要求

- 可参考 Navicat 的信息层级和交互习惯。
- 不直接复制 Navicat 图标、配色数值、字体、品牌名称和素材。
- 使用自有名称、自有图标集和独立主题设计。
- 项目说明中使用“功能参考/兼容类似操作”，不宣传为 Navicat 克隆版。

---

## 9. 详细交互规范

### 9.1 画布操作

| 操作 | macOS | Windows |
|---|---|---|
| 平移画布 | 空白处拖动 / Space + 拖动 | 空白处拖动 / Space + 拖动 |
| 缩放 | 触控板双指 / Cmd + 滚轮 | Ctrl + 滚轮 |
| 选择节点 | 单击 | 单击 |
| 追加选择 | Shift/Cmd + 单击 | Shift/Ctrl + 单击 |
| 框选 | 空白处按住 Shift 拖动 | 空白处按住 Shift 拖动 |
| 全选 | Cmd + A | Ctrl + A |
| 删除画布对象 | Delete/Backspace | Delete |
| 撤销 | Cmd + Z | Ctrl + Z |
| 重做 | Cmd + Shift + Z | Ctrl + Shift + Z |
| 查找 | Cmd + F | Ctrl + F |
| 适应画布 | F | F |
| 100% 缩放 | 0 | 0 |

删除键只能删除 Diagram 中的展示对象或逻辑关系，绝不能删除数据库表或真实外键。

### 9.2 表节点操作

- 单击标题：选择表。
- 拖动标题：移动表。
- 双击标题：打开右侧完整属性。
- 单击折叠按钮：只保留表头。
- 双击字段：在检查器显示字段详情。
- 从字段右侧 Handle 拖动：创建逻辑关系。
- 右键表：仅显示关联、复制表名、复制限定名、复制 DDL、隐藏、锁定。

### 9.3 关系操作

- 单击关系线：选中并显示端点、基数和折点。
- 双击：打开关系检查器。
- 拖动线段或折点：调整路径。
- Shift + 单击线段：新增折点。
- 选择折点后 Delete：删除折点。
- 真实外键只允许修改展示样式，不允许修改结构。
- 逻辑关系允许编辑和删除。

### 9.4 自动布局

自动布局提供：

- 从左到右。
- 从上到下。
- 紧凑模式。
- 分层模式。
- 仅布局选中节点。
- 保留锁定节点。

布局完成后作为一个历史操作，可一次撤销。

### 9.5 搜索与聚焦

- 搜索范围：表名、字段名、注释。
- 支持模糊搜索和大小写忽略。
- 结果列表显示 Schema、表、匹配字段。
- Enter 定位下一个结果。
- 定位时平滑移动视口，不强制改变用户缩放级别。

---

## 10. 数据来源与反向工程

### 10.1 元数据来源

优先使用 PostgreSQL 系统目录，因为其信息最完整：

- `pg_namespace`：Schema。
- `pg_class`：表、视图、分区表。
- `pg_attribute`：字段。
- `pg_type`：字段类型和枚举。
- `pg_constraint`：主键、外键、唯一、检查约束。
- `pg_index`、`pg_indexes`：索引。
- `pg_description`：表和字段注释。
- `pg_get_expr`：默认值和表达式。

同时保留 `information_schema` 适配层，为未来多数据库支持提供标准接口。

### 10.2 最小数据库权限

首期应用只执行元数据查询。推荐创建只读账号：

```sql
GRANT CONNECT ON DATABASE target_database TO er_canvas_reader;
GRANT USAGE ON SCHEMA public TO er_canvas_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO er_canvas_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO er_canvas_reader;
```

如果仅查看结构且不预览数据，可进一步缩减表数据 SELECT 权限。应用不应要求超级用户权限。

### 10.3 对象稳定标识

工作区不能仅用表名保存布局。建议内部 ID：

```text
databaseFingerprint/schemaName/objectKind/objectName
```

其中 `databaseFingerprint` 由以下非敏感信息计算：

```text
host + port + database + server identity
```

密码不得参与 Fingerprint 或写入工作区。

### 10.4 Schema 刷新合并规则

1. 相同稳定 ID：保留布局并更新字段。
2. 新增对象：加入待布局区。
3. 删除对象：标记为失效，由用户确认从 Diagram 移除。
4. 重命名对象：优先用 PostgreSQL OID 辅助识别；无法确认时按删除+新增处理。
5. 真实外键变化：以数据库为准。
6. 逻辑关系：只要两端字段仍存在就保留，否则标记为失效。

---

## 11. 应用内部数据模型

```ts
type ObjectId = string;

interface DatabaseSnapshot {
  connectionId: string;
  databaseName: string;
  serverVersion: string;
  capturedAt: string;
  schemas: DbSchema[];
}

interface DbSchema {
  name: string;
  tables: DbTable[];
  views: DbView[];
}

interface DbTable {
  id: ObjectId;
  schema: string;
  name: string;
  comment?: string;
  kind: "table" | "partitioned-table";
  columns: DbColumn[];
  primaryKey?: DbKey;
  uniqueKeys: DbKey[];
  indexes: DbIndex[];
  foreignKeys: DbForeignKey[];
}

interface DbColumn {
  id: ObjectId;
  name: string;
  ordinal: number;
  dataType: string;
  formattedType: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  primaryKey: boolean;
  foreignKey: boolean;
  unique: boolean;
}

interface DbForeignKey {
  id: ObjectId;
  name: string;
  sourceTableId: ObjectId;
  sourceColumnIds: ObjectId[];
  targetTableId: ObjectId;
  targetColumnIds: ObjectId[];
  onDelete: string;
  onUpdate: string;
  deferrable: boolean;
}

interface LogicalRelationship {
  id: string;
  sourceColumnId: ObjectId;
  targetColumnId: ObjectId;
  cardinality: "one-to-one" | "one-to-many" | "many-to-many" | "unknown";
  name?: string;
  description?: string;
  source: "manual" | "imported-config";
}

interface DiagramDocument {
  id: string;
  name: string;
  nodeStates: Record<ObjectId, DiagramNodeState>;
  logicalRelationships: LogicalRelationship[];
  notes: DiagramNote[];
  viewport: { x: number; y: number; zoom: number };
  settings: DiagramSettings;
}
```

---

## 12. 工作区文件格式

建议扩展名：`.ercanvas`，内容为版本化 JSON：

```json
{
  "formatVersion": 1,
  "applicationVersion": "0.1.0",
  "connectionRef": "local-dev-postgres",
  "databaseFingerprint": "sha256:...",
  "schemaNames": ["public"],
  "diagrams": [],
  "createdAt": "2026-09-23T00:00:00.000Z",
  "updatedAt": "2026-09-23T00:00:00.000Z"
}
```

工作区不得包含：

- 数据库密码。
- 完整连接字符串中的密码。
- 表中的业务数据。
- Token、SSH 私钥或 SSL 私钥正文。

---

## 13. 技术架构

### 13.1 技术选型

| 层 | 选型 | 说明 |
|---|---|---|
| 桌面容器 | Tauri 2 | 包体较小，权限可约束，适合本地工具 |
| 前端 | React + TypeScript + Vite | 组件生态成熟 |
| 图编辑器 | `@xyflow/react` | 节点、边、缩放、拖动、小地图 |
| 自动布局 | `elkjs` | 分层布局、端口、正交关系线 |
| 本地状态 | Zustand | 画布交互状态简单直接 |
| 异步状态 | TanStack Query | 连接测试、元数据加载、刷新 |
| 数据库驱动 | Rust `tokio-postgres` | PostgreSQL 原生异步客户端 |
| 密钥保存 | 系统 Keychain/Credential Manager | 不保存明文密码 |
| 非敏感配置 | Tauri Store 或本地 JSON | 连接名称、Host、Port、布局 |
| 测试 | Vitest + Playwright + Rust tests | 单元、组件、端到端 |

### 13.2 为什么选择 Tauri

- 可以继续使用 React 构建复杂画布。
- 数据库连接放在 Rust 后端，避免向 WebView 暴露数据库驱动和密码。
- 可通过 Capability 限制文件、网络和命令访问。
- 更适合打包成本地个人工具。

如果团队暂时没有 Rust 经验，可以用 Electron + Node `pg` 完成 MVP，但应保持相同的前后端边界，后续再评估迁移。

### 13.3 分层结构

```text
React UI
  ├── Connection UI
  ├── Schema Explorer
  ├── ER Canvas
  ├── Inspector
  └── Export UI
        ↓ Tauri Command
Application Services
  ├── ConnectionService
  ├── IntrospectionService
  ├── WorkspaceService
  ├── LayoutService
  └── ExportService
        ↓
Infrastructure
  ├── PostgreSQL Adapter
  ├── System Keychain
  ├── Local File Store
  └── Logging
```

### 13.4 进程安全边界

```text
WebView / React
  不能直接访问数据库密码
  不能执行任意 SQL
       ↓ 受控 Command
Tauri / Rust
  校验命令参数
  从 Keychain 读取密码
  只执行内置元数据 SQL
       ↓
PostgreSQL
```

---

## 14. 推荐项目目录

```text
er-canvas/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── connections/
│   │   ├── schema-explorer/
│   │   ├── diagram/
│   │   ├── inspector/
│   │   └── export/
│   ├── domain/
│   │   ├── database-model.ts
│   │   ├── diagram-model.ts
│   │   └── workspace-model.ts
│   ├── services/
│   ├── stores/
│   ├── styles/
│   └── tests/
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   ├── postgres/
│   │   ├── keychain/
│   │   ├── workspace/
│   │   └── errors.rs
│   ├── capabilities/
│   └── Cargo.toml
├── fixtures/
│   ├── small-schema.sql
│   ├── ecommerce-schema.sql
│   └── large-schema.sql
├── docs/
│   ├── architecture.md
│   ├── metadata-contract.md
│   └── security.md
└── package.json
```

---

## 15. 核心模块设计

### 15.1 ConnectionService

职责：

- 管理连接配置。
- 测试连接。
- 请求系统密钥链保存/读取密码。
- 显示 PostgreSQL 版本、延迟和 SSL 状态。
- 连接失败时映射为用户可理解的错误。

错误分类：

- DNS/网络不可达。
- 连接超时。
- 用户名或密码错误。
- 数据库不存在。
- SSL 配置错误。
- 权限不足。
- PostgreSQL 版本不支持。

### 15.2 IntrospectionService

职责：

- 执行固定、参数化的元数据查询。
- 将 `pg_catalog` 返回值转换为统一领域模型。
- 处理复合主键、复合外键、表达式索引和枚举。
- 返回警告列表，不因单个对象解析失败而丢弃整个 Schema。

禁止：

- 接收前端传入的任意 SQL。
- 将数据库业务数据返回前端。
- 使用超级用户专属接口作为正常依赖。

### 15.3 DiagramService

职责：

- 将数据库模型转换为 React Flow Nodes/Edges。
- 合并真实外键和逻辑关系。
- 管理展开、折叠和可见性。
- 计算字段级连接端口。
- 管理历史记录。

### 15.4 LayoutService

职责：

- 将节点尺寸和连接端口传给 ELK。
- 支持全图和选中区域布局。
- 锁定节点不参与移动。
- 布局结果一次性写入历史栈。
- 大图布局放入 Web Worker，避免阻塞 UI。

### 15.5 WorkspaceService

职责：

- 创建、打开、保存 `.ercanvas` 文件。
- 自动保存和崩溃恢复。
- 格式版本迁移。
- 维护连接引用，但不保存密码。
- 刷新数据库后合并旧布局。

### 15.6 ExportService

职责：

- 导出当前视口或完整画布。
- SVG 保留文本和矢量线条。
- PNG 支持 1x、2x、4x。
- 大画布导出时分块渲染，避免内存峰值。
- 输出中包含可选标题、生成时间和 Schema 名称。

---

## 16. 状态管理

状态分为四类：

### 持久领域状态

- 数据库 Snapshot。
- Diagram 文档。
- 逻辑关系。
- 便签和分组。

### 画布临时状态

- 当前选择。
- 拖动状态。
- Hover 状态。
- Context Menu。
- 正在创建的关系。

### UI 偏好

- 主题。
- 字段类型是否显示。
- 小地图是否显示。
- 默认关系表示法。

### 敏感状态

- 数据库密码。
- SSH/SSL 密钥引用。

敏感状态只能存在于 Tauri 后端内存或系统密钥链中，不进入 Zustand、React DevTools 或日志。

---

## 17. 安全设计

### 17.1 默认只读

- Rust 后端只注册预定义元数据查询 Command。
- 不暴露 `execute_sql(sql: string)` 一类通用命令。
- 连接界面明确建议只读数据库账号。
- 状态栏持续显示 `READ ONLY`。

### 17.2 凭证安全

- 密码保存到 macOS Keychain / Windows Credential Manager。
- 工作区只保存凭证引用 ID。
- 日志中遮蔽用户名、Host 可选遮蔽、密码永不记录。
- 崩溃报告不包含连接字符串。

### 17.3 网络安全

- 支持 PostgreSQL SSL。
- `verify-full` 模式校验证书和主机名。
- 首期不支持 SSH Tunnel；如后续加入，私钥只保存路径和密钥链口令。

### 17.4 Tauri 权限

- 文件访问限制在用户主动选择的工作区和导出目标。
- 禁止任意 Shell 执行。
- 禁止 WebView 任意网络请求。
- 每个 Tauri Command 校验参数。

---

## 18. 性能设计

### 18.1 目标规模

| 规模 | 表数量 | 字段数量 | 目标体验 |
|---|---:|---:|---|
| 小型 | 1～30 | < 500 | 即时加载 |
| 中型 | 31～150 | < 3,000 | 流畅操作 |
| 大型 | 151～300 | < 8,000 | 支持筛选后使用 |

### 18.2 优化策略

- 元数据查询按 Schema 批量读取，避免逐表请求。
- React Flow 节点数据保持扁平和稳定引用。
- 非可视区域减少复杂字段渲染。
- 缩放低于阈值时隐藏字段文本。
- 自动布局放到 Web Worker。
- 搜索索引在 Snapshot 加载后一次构建。
- 保存采用 500～1000ms Debounce。
- 导出完整大图时给出进度和取消按钮。

---

## 19. 错误处理与日志

### 19.1 用户错误提示格式

每个错误包含：

- 简短标题。
- 可理解的原因。
- 建议操作。
- 可复制的技术详情。
- 错误代码。

示例：

```text
无法连接数据库

PostgreSQL 拒绝了用户 er_canvas_reader 的登录。
请检查用户名、密码和 pg_hba.conf 配置。

错误代码：DB_AUTH_FAILED
```

### 19.2 日志级别

- ERROR：功能失败。
- WARN：部分元数据无法解析、逻辑关系失效。
- INFO：连接、刷新、保存、导出。
- DEBUG：对象数量、布局耗时、查询耗时。

日志不得记录密码、Token、完整业务数据或私钥正文。

---

## 20. 测试策略

### 20.1 单元测试

- PostgreSQL 类型格式化。
- 主键、外键、复合键解析。
- Crow's Foot 基数推导。
- Snapshot 合并。
- 工作区版本迁移。
- 逻辑关系失效检测。
- 布局输入输出转换。

### 20.2 集成测试

使用 Docker PostgreSQL fixture：

- 空 Schema。
- 常规电商 Schema。
- 复合主键/外键。
- 多 Schema 同名表。
- 枚举、数组、JSONB、生成列。
- 分区表。
- 100+ 表的大型 Schema。

### 20.3 UI 测试

- 创建连接和连接失败提示。
- 搜索定位。
- 拖动、缩放、框选、多选。
- 创建和删除逻辑关系。
- 自动布局撤销。
- 保存后重开恢复。
- 数据库刷新后保留布局。
- 导出 PNG/SVG。

### 20.4 视觉回归

- 浅色/深色主题。
- 长表名、长字段名。
- 复合外键。
- 多条平行关系。
- 20、100、300 表画布。
- 1280×720 与高分屏。

---

## 21. P0 验收标准

### 连接

- [ ] 可以连接本地和远程 PostgreSQL。
- [ ] 可以测试连接并显示明确错误。
- [ ] 密码可保存至系统密钥链。
- [ ] 工作区文件中不存在明文密码。

### 元数据

- [ ] 正确显示表、视图、字段和类型。
- [ ] 正确识别主键、复合主键。
- [ ] 正确识别外键、复合外键。
- [ ] 正确显示唯一约束、索引、默认值和注释。
- [ ] 正确显示 `ON DELETE` 和 `ON UPDATE`。

### 画布

- [ ] 支持平移、缩放、拖动、框选和多选。
- [ ] 支持表折叠和字段显示切换。
- [ ] 支持搜索并定位。
- [ ] 支持小地图和适应画布。
- [ ] 支持自动布局和撤销。
- [ ] 真实外键使用实线，逻辑关系使用虚线。

### 持久化

- [ ] 保存并恢复节点位置、折叠状态、视口。
- [ ] 保存并恢复逻辑关系。
- [ ] 数据库刷新后保留未变对象的位置。
- [ ] 新增表不会打乱原有布局。

### 导出

- [ ] 支持导出完整画布 PNG。
- [ ] 支持导出完整画布 SVG。
- [ ] 导出结果无节点裁切、文字重叠或缺失关系线。

### 安全

- [ ] 应用没有任意 SQL 执行接口。
- [ ] 查看和编辑 Diagram 不会修改数据库。
- [ ] 日志中不出现密码。

---

## 22. 里程碑计划

以一名开发者兼职/个人开发估算：

### M1：项目骨架与连接（第 1 周）

- 初始化 Tauri、React、TypeScript。
- 建立前后端 Command 通信。
- PostgreSQL 连接表单和测试连接。
- 系统密钥链保存密码。
- 建立错误模型与日志。

交付：可以安全连接 PostgreSQL，并列出 Schema。

### M2：元数据反向工程（第 2 周）

- 表、字段、类型、注释。
- 主键、外键、唯一约束和索引。
- 领域模型和 Fixture 数据库。
- 元数据单元/集成测试。

交付：可以输出完整 JSON Snapshot。

### M3：ER 画布（第 3 周）

- React Flow 自定义表节点。
- 字段级端口和外键关系线。
- 缩放、平移、多选、小地图。
- 搜索定位。

交付：可以稳定查看自动生成的 ER 图。

### M4：布局和工作区（第 4 周）

- ELK 自动布局。
- 对齐和锁定基础能力。
- 撤销/重做。
- `.ercanvas` 保存、打开和自动保存。
- 刷新后布局合并。

交付：日常可持续使用的 ER 工作区。

### M5：逻辑关系和导出（第 5 周）

- 创建、编辑、删除逻辑关系。
- 关系样式与说明。
- PNG/SVG 导出。
- 大画布优化。

交付：满足当前 eSIM 项目完整关系建模。

### M6：质量与发布（第 6 周）

- 完整 UI/端到端测试。
- 视觉细节优化。
- macOS 签名和安装包。
- Windows 构建验证。
- 用户文档和示例项目。

交付：v0.1.0 可发布版本。

---

## 23. 风险与应对

| 风险 | 影响 | 应对方式 |
|---|---|---|
| 复杂 PostgreSQL 类型解析 | 字段展示错误 | Fixture 覆盖枚举、数组、Domain、生成列 |
| 大量节点导致卡顿 | 画布不可用 | 缩放降级、Worker 布局、业务子图 |
| 关系线交叉严重 | 可读性差 | ELK 正交布局、端口约束、手工折点 |
| Schema 刷新打乱布局 | 用户不敢刷新 | 稳定 ID、锁定节点、新增表待布局区 |
| 密码泄漏 | 严重安全事故 | Keychain、日志脱敏、前端不接触密码 |
| 功能范围膨胀 | 无法完成 MVP | 坚持只读 ER 工具定位，SQL IDE 不进入 P0/P1 |
| 过度模仿商业产品 | 法律和品牌风险 | 功能对标，视觉、名称和素材原创 |
| Rust 学习成本 | 开发延期 | Command 边界保持简单，必要时 Electron MVP |

---

## 24. 后续演进路线

### v0.2

- 多 Diagram、图层、便签、分组。
- Crow's Foot/IDEF1X/UML 切换。
- DDL 导入和离线模型。
- 数据字典导出。

### v0.3

- Schema 差异比较。
- Git 友好的工作区格式。
- 关系路径分析。
- MySQL 适配评估。

### v1.0

- 稳定插件接口。
- 模型生成 DDL，但默认只预览。
- 可选团队工作区。
- 完整数据库兼容矩阵。

---

## 25. 开源协议与依赖策略

建议项目使用 MIT 或 Apache-2.0；如仅个人闭源使用，也应保留第三方依赖声明。

首期重点依赖：

- React：MIT。
- `@xyflow/react`：MIT。
- `elkjs`：EPL-2.0，发布前需要核对分发义务。
- Tauri：Apache-2.0/MIT 双许可。
- PostgreSQL Driver：按最终选型核对许可证。

不得复制或打包 Navicat 的图标、图片、字体、二进制、帮助文档正文或其他专有资源。

---

## 26. 立项决策结论

项目具备可行性。第一版的关键不是实现数据库客户端，而是实现以下闭环：

```text
连接 PostgreSQL
  -> 读取真实 Schema
  -> 生成高质量 ER 图
  -> 手工补充逻辑关系
  -> 保存布局
  -> 导出文档
```

建议批准立项，按 6 周个人开发计划实施 P0。开发期间必须持续控制范围，所有数据库写入、SQL 编辑、多数据库和协作功能均不进入首期。

---

## 27. 参考资料

- [Navicat Data Modeler 功能介绍](https://www.navicat.com/en/products/navicat-data-modeler.html)
- [Navicat Data Modeler 功能矩阵](https://www.navicat.com/en/products/navicat-data-modeler-feature-matrix.html)
- [Navicat ER Diagram 操作说明](https://www.navicat.com/manual/pdf_manual/en/navicat_16/win_manual/navicat_en.pdf)
- [React Flow 官方文档](https://reactflow.dev/)
- [ELK.js 项目文档](https://github.com/kieler/elkjs)
- [Tauri Capability 安全文档](https://tauri.app/security/capabilities/)
- [PostgreSQL Information Schema](https://www.postgresql.org/docs/current/information-schema.html)

