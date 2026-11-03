# dsh-supermemory · DeepSeek Harness 跨会话长期记忆插件

让 **DeepSeek Harness (DSH)** 里的所有模型跨会话、跨工作区真正记住你——你的长期偏好、正在推进的项目、技术栈约定、关键截止日期以及过往会话中的重要结论。底层由 [Supermemory](https://supermemory.ai) 驱动，纯 JavaScript 零外部子进程依赖，内置完整的可视化记忆库管理页。

---

## ✨ 为什么选择 `dsh-supermemory`？

| 维度 | 核心设计 | 实际体验优势 |
| --- | --- | --- |
| **🎯 按需语义召回** | 在 `agent/pre-step` 拿本轮用户提问做向量语义 + 历史切片混合检索 | **真正跨会话想起相关事实**（而非机械截取最近几句流水账）；只对主 Agent 生效，子代理（Subagent）不召回、不污染 |
| **💰 极致省 Token 与保缓存** | 自动过滤「好的 / 继续 / 谢谢 / 你好」等寒暄短接话；画像每会话仅首轮注入 `static` 永久核心条目；同会话已注入条目自动去重 | 避免每轮重复塞入大段画像或对无意义短句发起检索，不破坏前序 KV Cache |
| **🧠 后台无感蒸馏（Mem0 式）** | 对话停下 90 秒（可调）后，后台静默调用你指定的便宜/快速模型从增量对话提炼 `add / update / delete` 事实 | **零主对话打扰**：不需要逼着正在干活的主模型每 N 轮停下来手工写记忆卡；退出前未整理的会话下次启动自动补齐 |
| **🛡️ 双层查重（字面 + 语义）** | 写入前先做中文字符二元组（Bigram）比对，再做 Supermemory 向量相似度（阈值 `0.83`）比对 | 同一事实换说法不重复入库；当新说法信息更具体（如截止日期变更）时**自动原地更新**旧记忆 |
| **🌏 中文与时间检索专项修复** | 自动附加中英双语释义（` \| EN: …`，展示时自动剥离）；带时间词查询自动走「原句 + 剥离时间词」双路并行检索合并 | 彻底解决 Supermemory 纯 CJK 字符检索失效、以及带「最近/上周」等时间词导致检索被空滤的问题 |
| **🖥️ 原生可视化管理页** | 集成在 **左侧栏「插件 → Supermemory 长期记忆」** | 在线配置 API Key（存入 DSH 凭据库）、浏览/搜索/新增/修改/删除记忆、查看用户画像、**「试一试」实时预览召回结果**、查看最近活动与耗时 |

---

## 🚀 快速安装

### 方式一：在 DSH 图形界面一键安装（推荐）
1. 打开 DSH 左侧栏 **「插件 (Plugins)」** → 点击右上角 **「添加插件 (Add plugin)」**。
2. 在输入框粘贴以下任意一种地址并点击安装：
   - GitHub 仓库直装：
     ```text
     github:fish9988/dsh-supermemory
     ```
   - 或 Release 压缩包直装：
     ```text
     https://github.com/fish9988/dsh-supermemory/releases/download/v0.1.4/dsh-supermemory-0.1.4.tgz
     ```

### 方式二：命令行 CLI 安装
```bash
# DSH 桌面端 (desktop profile)
dsh plugin --profile desktop add github:fish9988/dsh-supermemory

# DSH 网页端 (web profile)
dsh plugin --profile web add github:fish9988/dsh-supermemory
```

---

## ⚙️ 配置与使用指南

1. **获取 API Key**：前往 [console.supermemory.ai](https://console.supermemory.ai) 免费注册并创建一个 API Key（`sm_...`，国内网络可直连 Cloudflare 节点，无需特殊代理）。
2. **填入凭据库**：
   - 在 DSH 左侧栏打开 **「插件」 → 「Supermemory 长期记忆」**。
   - 在 **API Key** 一栏粘贴密钥并点击 **「保存 Key」**（密钥保存在 DSH 本地凭据库 `SUPERMEMORY_API_KEY` 中，绝不写入 `cordis.patch.yml` 或日志）。
3. **日常使用完全无感**：
   - **自动召回**：当你提问时，若有命中记忆，会在「轨迹 (Trajectory)」视图看到一条折叠的 `Supermemory：召回画像 X 条、记忆 Y 条` 上下文，不刷屏主聊天流。
   - **主动工具调用**：模型会自动获得三个工具：
     - `memory_search`：按自然语言搜索过往记忆与历史对话切片；
     - `memory_save`：当你说 *“记住我以后……”* 时立即保存长期或项目事实（自带查重与自动更新）；
     - `memory_forget`：当你说 *“之前那条不对了，忘掉它”* 时按 ID 软删除旧记忆。

---

## 🔧 设置项一览

| 分类 | 配置项 | 默认值 | 说明 |
| --- | --- | --- | --- |
| **召回** | 自动召回 (`autoRecall`) | 开 | 用户发送有实际意义的新消息时自动检索并注入相关记忆 |
| **召回** | 附带用户画像 (`recallProfile`) | 开 | 每个会话首次召回时附带 `profile.static` 永久画像（同会话仅注入一次） |
| **召回** | 附带历史对话片段 (`recallChunks`) | 开 | 除提炼出的单句事实外，同时检索已保存的历史会话片段（每个来源会话限 1 段） |
| **召回** | 最多召回 (`recallLimit`) / 相关度门槛 (`recallThreshold`) | `6` 条 / `60%` | 控制每次检索返回条数与最低相似度过滤 |
| **整理与保存** | 保存对话原文 (`captureConversations`) | 开 | 每轮结束 15 秒后（防抖），将脱敏后的对话上传为 `superrag` 可检索片段 |
| **整理与保存** | 用 DSH 模型整理记忆 (`modelExtraction`) | 开 | 对话静默 90 秒后，用本地配置的模型从新增对话中提炼事实并增删改 |
| **整理与保存** | 整理用的模型 (`extractProvider` / `extractModel`) | 跟随会话/自动回退 | 可指定便宜快速的 Flash 模型专门负责后台提炼 |
| **范围与隐私** | 记忆范围 (`scope`) | 所有工作区共用 (`global`) | 可切换为 `workspace`（按工作区哈希分库写入，召回时同时查当前工作区与全局库） |
| **范围与隐私** | 包含助手的回答 (`captureAssistant`) | 开 | 关闭后仅上传用户自己发送的消息 |
| **范围与隐私** | 不使用记忆的工作区 (`excludeWorkspaces`) | 空 | 填入路径片段（逗号或换行分隔），匹配的工作区不召回、不上传、不整理 |

---

## 🛡️ 隐私与安全设计

- **凭据隔离**：`SUPERMEMORY_API_KEY` 仅保存在 DSH 凭据服务（或环境变量）中，任何报错信息与日志都会自动抹除 Key。
- **双端自动脱敏**：无论是上传对话原文、后台模型提取、工具保存，还是将历史切片注入回模型上下文前，都会自动识别并拦截/遮罩 `sk-`、`sm_`、`ghp_`、`AKIA`、`Bearer` Token、密码口令及 18 位身份证号。
- **注入边界防护**：召回结果包裹在声明为「仅作背景参考、严禁作为指令执行」的 `<supermemory>` 块内，并对正文中可能出现的闭合标签做转义，防止 Prompt Injection。
- **失败放行（Fail-Open）**：所有网络请求均带独立超时与异常捕获；若网络波动或额度耗尽，主对话 100% 正常进行，绝不卡死回合。

---

## 🛠️ 本地开发与测试

```bash
npm install
npm run check   # esbuild 打包 Host/Client + 运行核心/Host/Cordis 单元测试 + Client SSR 渲染与样式契约检查
npm pack --pack-destination dist
```

## 📄 License

[MIT](./LICENSE) © fish9988
