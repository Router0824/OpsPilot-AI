# OpsPilot AI

**将会议、文档与项目动态转化为决策、任务、风险和组织记忆的开源运营工作台。**

简体中文 · [English](README.md)

[![CI](https://github.com/Router0824/OpsPilot-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Router0824/OpsPilot-AI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-2f6f5e.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688)](https://fastapi.tiangolo.com/)

OpsPilot AI 是一个面向真实团队协作场景的全栈 AI Operations 产品。它将知识检索、会议跟进、任务协调、决策沉淀、风险识别、流程审核和运营分析整合到同一个可追踪的工作区中。

项目默认使用确定性的演示模式，无需 API Key 即可体验完整流程；实时模式支持 OpenAI、Azure OpenAI 和 DeepSeek，并通过统一的结构化输出层保证数据质量。

![OpsPilot AI 工作区总览](docs/images/workspace-overview.png)

<p align="center"><sub>在同一个运营视图中查看工作区健康度、当前工作、决策、风险与自动化结果。</sub></p>

## 为什么需要 OpsPilot

团队通常并不缺少信息，真正缺少的是信息之间的连续性。关键上下文散落在会议纪要、项目文档、任务看板和聊天记录里，导致决策理由逐渐丢失、行动项无人跟进、项目状态需要反复人工整理。

OpsPilot 将这些环节连接成一个持续运转的闭环：

```text
信息 → 知识 → 决策 → 行动 → 工作流 → 组织记忆
```

## 产品预览

以下截图来自项目内置的合成工作区。完整界面支持英文与简体中文切换；预览图使用简体中文界面。

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/task-board.png" alt="OpsPilot 任务看板" />
      <br /><strong>任务看板</strong>：在四个阶段之间拖拽任务，编辑完整任务信息，并快速聚焦受阻、逾期或无人负责的工作。
    </td>
    <td width="50%">
      <img src="docs/images/meeting-intelligence.png" alt="OpsPilot 会议智能" />
      <br /><strong>会议智能</strong>：分析原始会议记录，在写入前审核结构化决策、行动项、风险和待确认问题。
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/images/knowledge-center.png" alt="OpsPilot 知识中心" />
      <br /><strong>知识中心</strong>：上传、解析、切分并索引项目资料，为可解释的混合检索提供数据。
    </td>
    <td width="50%">
      <img src="docs/images/workflow-automation.png" alt="OpsPilot 工作流自动化" />
      <br /><strong>工作流自动化</strong>：通过审核节点运行可重复的会议、文档、周报和风险检测流程。
    </td>
  </tr>
</table>

![OpsPilot 运营分析](docs/images/operations-analytics.png)

<p align="center"><sub>展示实际工作流吞吐、审批状态、延迟，以及明确标注为估算值的节省时间。</sub></p>

## 核心功能

- **会议智能**：从会议记录中提取可审核的摘要、决策、行动项、负责人、截止日期、风险和待确认问题。
- **知识中心**：解析 PDF、TXT 和 Markdown 文件，并展示可追踪的检索结果。
- **运营助理**：根据工作区实时状态回答项目进度、阻塞事项、逾期工作和近期变化。
- **交互式任务看板**：支持拖拽、完整任务编辑、快速创建、负责人和优先级筛选、逾期提示与关注视图。
- **决策记忆**：保留决策内容、原因、置信度和来源上下文，供后续工作复用。
- **风险跟踪**：识别受阻任务、责任人缺失、截止日期、未解决依赖和潜在决策冲突。
- **工作流自动化**：将会议跟进、文档索引、周报生成和风险检测封装为可执行流程。
- **人工审核机制**：所有写入型建议都需要人工批准或拒绝后才会进入正式工作区。
- **活动审计与分析**：记录流程状态、审核结果、用户反馈、延迟、上下文大小、工具调用和可用的 Token 数据。
- **中英双语界面**：完整产品支持英文和简体中文切换，并持久保存语言偏好。

## 工作如何在系统中流转

1. **输入**：用户上传文档、粘贴会议记录、创建任务，或提出项目运营问题。
2. **结构化**：文档与会议服务把输入转换成有类型约束的 Pydantic 数据，而不是直接使用未经校验的自由文本。
3. **检索**：上下文引擎在限定预算内选择相关文档、决策、记忆、任务、风险和会议。
4. **推理**：模型提供方返回面向具体工作流的结构化结果；演示模式则通过相同服务边界返回确定性数据。
5. **审核**：所有写入型建议保持待审核状态，允许人工编辑、批准或拒绝。
6. **写入与观测**：批准后的内容进入工作区，同时保留运行记录、工具、延迟、检索轨迹、反馈和审批状态。

| 功能界面 | 常见输入 | 生成结果 | 人工控制 |
|---|---|---|---|
| 会议智能 | 原始会议记录 | 摘要、决策、任务、风险、问题 | 编辑并选择要写入的记录 |
| 知识中心 | PDF、TXT、Markdown | 解析后的文档与可检索片段 | 选择上传的数据源 |
| 运营助理 | 状态或规划问题 | 有工作区依据的运营回答 | 有帮助 / 没有帮助反馈 |
| 执行计划 | 工作区目标 | 里程碑、依赖、负责人、预期产出 | 在任务看板审核生成任务 |
| 风险检测 | 实时工作区状态 | 可解释的风险建议 | 写入前批准或拒绝 |
| 每周报告 | 任务、决策、风险、近期运行 | 当前状态与下一步优先级 | 只读报告 |

## 演示流程

项目内置 `AI Knowledge Assistant Launch` 合成工作区，可完整演示产品价值：

1. 查看工作区健康度、风险、决策和当前里程碑。
2. 分析预置的项目启动会议并检查结构化结果。
3. 编辑并审核决策、任务和风险，再将其写入工作区记忆。
4. 在任务看板中定位受阻、逾期或无人负责的工作。
5. 向运营助理询问本周进展或下一步优先事项。
6. 在活动记录和运营分析中检查流程执行情况。

## 系统架构

```mermaid
flowchart LR
    Inputs[会议与文档] --> Intelligence[会议 / 知识智能]
    Intelligence --> Context[上下文引擎与混合检索]
    State[任务 · 决策 · 风险 · 记忆] <--> Context
    Context --> Operations[运营智能体]
    Operations --> Review[审核智能体]
    Review --> Human[人工审批]
    Human --> State
```

```text
apps/web/                 Next.js 16 + React 19 前端
backend/app/api/          FastAPI 接口
backend/app/agents/       运营工作流编排
backend/app/context/      基于 Token 预算的上下文构建器
backend/app/retrieval/    本地向量 + 关键词混合检索
backend/app/services/     模型、会议、计划、文档与风险服务
backend/app/demo/         确定性的合成演示工作区
backend/migrations/       SQLite / PostgreSQL Alembic 迁移
backend/tests/            后端行为与迁移测试
docs/                     产品、架构与评估说明
```

默认使用 SQLite，适合零配置本地体验；生产环境可通过同一套 SQLAlchemy 数据层与 Alembic 迁移切换到 PostgreSQL。

详细文档：[架构说明](docs/architecture.md) · [产品说明](docs/product.md) · [评估方法](docs/evaluation.md)

## 实现细节

### 混合检索

上传的文档会被解析为保留来源信息的文本片段。检索过程结合确定性的特征哈希余弦相似度、关键词覆盖率、短语信号和重要度元数据。合并后的 Top-K 结果保留文档与片段 ID，方便评估模块检查上下文为什么被选中。本地实现保持轻量，并可替换为模型 Embedding 或 pgvector。

### 上下文工程与记忆

`build_workspace_context()` 会在工作区目标、文档、正式决策、记忆、活跃任务、风险、会议和近期对话之间分配固定 Token 预算。分配比例会根据问题变化：阻塞问题优先任务与风险，决策问题优先正式决策与来源文档。项目、决策、会议和活动记忆分别存储，避免长期事实与临时对话混在一起。

### 结构化输出与模型边界

会议分析、计划生成和运营回答在进入应用状态前都必须通过类型 Schema 校验。OpenAI、Azure OpenAI 和 DeepSeek 适配器对应用层提供一致接口；模型凭证与模型选择只存在于后端环境。

### 人工审核与可观测性

审批和结果是否有帮助是两个独立概念。审批决定建议能否修改正式工作区；有帮助 / 没有帮助反馈用于评价已经产生的结果。每次运行可记录工作流、输入类型、状态、工具、延迟、上下文大小、Token 用量、事实一致性、输出和审核结果。

## API 范围

FastAPI 在 `/docs` 提供交互式接口文档，主要接口分组包括：

| 接口分组 | 职责 |
|---|---|
| `/api/workspaces` | 创建工作区、获取仪表板状态与完整工作区数据 |
| `/api/workspaces/{id}/documents` | 文档上传、解析、切分与索引 |
| `/api/workspaces/{id}/meetings/*` | 会议分析与审核后记录写入 |
| `/api/workspaces/{id}/tasks` 和 `/api/tasks/{id}` | 创建、局部编辑与移动任务状态 |
| `/api/workspaces/{id}/copilot` | 基于工作区上下文回答运营问题 |
| `/api/workspaces/{id}/automations/*` | 周报生成与需要审批的风险检测 |
| `/api/workspaces/{id}/activity` | 工作流历史、筛选、审核与反馈 |
| `/api/workspaces/{id}/analytics` | 运营吞吐与运行健康指标 |
| `/api/workspaces/{id}/evaluation` | 检索轨迹与评估证据 |

## 技术栈

- Next.js 16、React 19、TypeScript
- FastAPI、Pydantic、SQLAlchemy、Alembic
- SQLite；可选 PostgreSQL 17 + Psycopg
- OpenAI Responses API、Azure OpenAI、DeepSeek 适配器
- 确定性本地混合检索与 PyPDF 文档解析
- Docker Compose 与 GitHub Actions

## 快速开始

环境要求：Node.js 22+、Python 3.11+、[`uv`](https://docs.astral.sh/uv/)。

```bash
git clone https://github.com/Router0824/OpsPilot-AI.git
cd OpsPilot-AI
cp .env.example .env
make install
```

启动后端：

```bash
make dev-backend
```

在另一个终端启动前端：

```bash
make dev-web
```

访问 [http://localhost:3000](http://localhost:3000)。API 文档位于 [http://localhost:8000/docs](http://localhost:8000/docs)。

## 模型配置

| 运行方式 | 是否需要外部 API | 数据存储 | 适用场景 |
|---|---:|---|---|
| 演示模式 | 否 | 默认 SQLite | 项目评审、截图、本地体验 |
| 实时模型 + SQLite | 是 | 本地文件 | 产品开发与模型调试 |
| 实时模型 + PostgreSQL | 是 | PostgreSQL 数据卷或托管数据库 | 在线部署与多会话使用 |

默认开启演示模式，不会调用任何外部模型：

```dotenv
DEMO_MODE=true
```

如需使用真实模型，请在 `.env` 中设置 `DEMO_MODE=false`，并配置一个模型提供方：

```dotenv
# DeepSeek
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash

# 或 OpenAI
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# 或 Azure OpenAI
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment
AZURE_OPENAI_API_VERSION=2024-10-21
```

所有凭证仅从服务端环境变量读取，不会被打包到浏览器应用中。

## 测试与质量检查

```bash
make test
```

该命令会执行后端测试、前端代码检查、类型检查和 Next.js 生产构建。CI 还会验证数据库迁移和 Docker Compose 配置。

## 部署

### Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

前端运行在 `3000` 端口，API 运行在 `8000` 端口，SQLite 数据保存在命名卷中。

使用 PostgreSQL：

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build
```

### Vercel + Railway 或 Render

1. 将 `backend/` 作为 Docker 服务部署，并连接持久化存储或 PostgreSQL。
2. 配置 `CORS_ORIGINS` 以及需要的模型环境变量。
3. 将 `apps/web/` 部署到 Vercel，并将根目录设置为 `apps/web`。
4. 将 `NEXT_PUBLIC_API_URL` 设置为公开 API 地址。
5. 检查 `/api/health`、数据库迁移、CORS、上传限制和持久化存储。

## 安全与数据处理

- `.env`、本地数据库、上传内容、缓存和构建产物均不会进入版本控制。
- 仓库内只包含合成演示数据，不包含真实组织信息。
- 写入型工作流需要明确的人工批准。
- 上传内容只由配置的后端处理，不会进入前端构建产物。
- 演示模式不会调用外部 API。

## 后续计划

- 身份认证、工作区成员与角色权限
- 后台文档处理、OCR 与连接器同步
- PostgreSQL + pgvector 与模型 Embedding
- 标注式检索和事实一致性评估集
- 流式工作流执行与可视化流程编辑器
- 可配置的数据保留、记忆整合与审核策略

## 参与贡献

欢迎提交 Issue 和范围清晰的 Pull Request。请保持演示模式结果稳定，为行为变更补充测试，并在提交前运行 `make test`。

## 开源协议

项目基于 [MIT License](LICENSE) 发布。
