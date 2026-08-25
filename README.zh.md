# 🍷 dsh-palate — 会长大的眼

[![ci](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml/badge.svg)](https://github.com/guo6x/dsh-palate/actions/workflows/ci.yml) [English](README.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件

> **设计审查工具量的是固定的尺；dsh-palate 练的是会长大的眼。**

大多数设计评审插件带一套静态规则，用到天荒地老也一样——用一次和用一万次，判断没区别。dsh-palate 相反：它维护一个**会积累的品味语料库**。你喂进去的每个例子、提炼的每条原则，都会让你 agent 的判断更准。**用得越多，眼越毒。**

## 为什么做这个

品味不是天赋，是**看多了练出来的模式识别**。看好的看坏的看够了，规律自己浮出来。dsh-palate 把这件事变成 agent 真能用的机制：

1. **喂** —— 记下你判过好坏的设计，以及*为什么*
2. **提炼** —— 反复出现的教训沉淀成原则
3. **评审** —— 拿积累下来的品味去评新设计，而不是套通用清单
4. **校正** —— 评审后记录哪些建议真有用；只强化被确认有效的原则，品味才会复利滚起来

## agent 得到的工具

| 工具 | 作用 |
|---|---|
| `palate_review` | 把积累的品味（原则 + 相关过往例子）组装成上下文，让 agent 基于*学到的*判断做评审 |
| `palate_feedback` | 用 `review_id` 记录用户是否觉得评审有用、哪些原则被采纳或拒绝；只强化被采纳的原则 |
| `palate_add` | 喂一个例子（好/坏/备注 + 原因 + 标签）进语料库——品味长大 |
| `palate_learn` | 从经验里提炼一条新原则，加进编码品味 |
| `palate_list` | 浏览积累的语料库 |
| `palate_principles` | 列出编码原则，按证据数排序 |
| `palate_effectiveness` | 查看哪些原则在真实评审反馈中被采纳或拒绝 |
| `palate_stats` | 积累了多少品味：学了多少例子、提炼了多少原则 |

自带 **12 条基础原则 + 4 个透明的教学案例**作为起始品味（好/坏仪表盘、可读数据表、套路化落地页），第一次评审就有具体证据，开箱即用——然后从这里开始长。

这 4 个起始案例只会在本地品味数据库为空时写入。安装或升级插件不会覆盖已有的品味库。

## 原理

```
palate_add (好/坏 + 为什么)  ──▶  品味语料库 (SQLite + Markdown 镜像)
palate_learn (新规则)         ──▶  编码原则
palate_review (一个设计)      ──▶  review_id + 原则 + 相关例子  ──▶  agent 写有据评审
        ▲                                                               │
        └── palate_feedback（采纳/拒绝 + 原因）──▶ 有效性统计 + 强化被采纳原则 ─┘
```

- **存储**：`node:sqlite`（Node ≥ 22 内置），存 `$DSH_HOME/palate/`，外加人可读的 `taste.md` / `principles.md` 镜像。零运行时依赖。
- **检索**：评审时按当前设计描述中的词、标签与中文词组对案例排序；没有足够相关的先例时，会明确留空而不是拿最新案例凑数。
- **反馈闭环**：每次 `palate_review` 会保留当时的原则和案例快照；`palate_feedback` 记录结果，`feedback.md` 镜像与面板展示真实采纳/拒绝情况。
- **面板**：可拖拽浮窗展示成长故事——学了多少例子、提炼了多少原则、最近评审主题、每次评审实际引用的案例，以及最近的判断。
- **配视觉**：先用视觉工具（如 `modlens_read_image`）读截图，再把描述喂给 `palate_review`。

## 说实话

这是**积累式检索 + 编码原则 + 显式反馈**，不是模型微调。插件提供学到的品味当上下文，*模型*来写真正的评审；只有用户/agent 用 `palate_feedback` 明确确认后，原则才获得额外证据。这让判断保持可审计（你能直接读 `taste.md`、`principles.md` 和 `feedback.md`），不用重训任何东西。

## 安装——复制、粘贴、验收

```sh
# GitHub 是当前受支持的发布渠道。
dsh plugin --profile web add github:guo6x/dsh-palate
```

如果 `dsh web` 正在运行，重启它再刷新页面。**当侧边栏底部出现 👁️ 按钮时，安装就完成了。**点开即可看到起始品味、原则和反馈历史。

要求：DSH web profile、Node ≥ 22。插件只用本地 SQLite 存储，不需要账号、API key 或 embedding 服务。

从本地 checkout 开发？在仓库目录执行 `dsh plugin --profile web add .`。仓库已提交 `lib/` 构建产物，所以 GitHub 安装不会跑构建脚本。

## 90 秒看见成长闭环

新开一个对话，直接粘贴这个安全、纯本地的任务：

> 给一个信息密集的分析仪表盘建立第一条品味记录。用 `palate_add` 记一个**反例**：“12 张 KPI 卡片视觉权重完全相同，真正的决策信号被淹没”；标签用 `dashboard, hierarchy`。然后用 `palate_review` 评审“一个有 12 张等权 KPI 卡、一个主要营收指标和一张小趋势图的分析仪表盘”，并说明你用了哪些已学原则。

回答应点出匹配到的记录和起始原则，而不是套泛泛的检查清单。打开 👁️ 面板，可以看到案例数增加和新评审出现。如果你真的采纳了一条建议，再让 agent 为该评审记录 `palate_feedback`；只有被确认有用的原则才会增加证据。

### 如果看不到 👁️ 按钮

- 确认插件安装在 **web** profile：`dsh plugin --profile web list dsh-palate`。
- 安装后必须重启 `dsh web`；仅刷新浏览器不会加载新的宿主代码。
- 确认 Node 为 22 或更新版本。插件没有其他运行时依赖需要安装。

## 开发

```sh
pnpm install
node build.mjs        # esbuild → lib/index.js（宿主 ESM）+ lib/client.js（ModuleLoader 包）
node tests/smoke.mjs  # 纯逻辑检查（无需浏览器）
```

MIT 协议。欢迎提想法和例子，开 issue。

## 已知限制

- **插件本身不做 embedding 语义匹配** —— 它在本地按标签、关键词与中文词组检索案例；更深的推理由模型基于组装好的上下文完成。
- **反馈需要显式记录** —— 插件不会猜测用户是否采纳了建议；评审完成后调用 `palate_feedback` 才会形成有效性数据。
- **Markdown 镜像在 v0.1 是只读导出**（人工编辑后合并回库在计划中）。
- **视觉靠外援** —— 配一个视觉工具来评审截图。
