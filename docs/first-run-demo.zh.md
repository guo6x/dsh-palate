# dsh-palate 首次成功体验

这份说明把“插件没装好”和“模型提供方没鉴权”拆成两条独立检查路径：

1. 不需要密钥的本地宿主链路检查；
2. 使用 Harness 当前提供方的真实 DSH Web 对话评审。

第一条路径不会读取 API key，也不会发起网络或模型请求。

## 1. 运行无密钥检查

在本仓库 checkout 根目录执行，要求 Node 22 或更新版本：

```sh
pnpm install
pnpm demo
```

命令会先构建已提交的宿主 bundle，再创建隔离的临时 `DSH_HOME`，最后通过 DSH 提供的宿主接口运行插件。成功时会看到类似：

```text
PASS plugin identifies itself as dsh-palate
PASS declares the host services it uses
PASS registers all thirteen tools
PASS registers the loopback /palate route
PASS seeds a useful first palate
PASS exposes two opt-in reference packs
PASS creates a tracked review with grounded evidence
PASS renders the review as a host tool message
PASS serves the same state to the Web panel

Keyless demo complete: host wiring, local SQLite, retrieval, and Web data are working.
```

这一步证明可安装 bundle、工具注册、本地数据库、相关性检索和面板数据路由都能工作；它不证明远程模型凭据有效。

## 2. 验证 Web 面板

把发布版本安装到 Web profile，然后重启正在运行的 Web 进程：

```sh
dsh plugin --profile web add github:guo6x/dsh-palate
dsh web
```

新开一个对话，点击侧边栏底部的眼睛按钮。全新的 profile 应该看到：

| 信号 | 首次运行时代表什么 |
| --- | --- |
| `本地品味库已就绪` | 面板可以读取 loopback 品味接口。 |
| `4` 个例子 | 已写入 4 个透明的起始教学案例。 |
| `12` 条原则 | 起始规则已可供第一次评审使用。 |
| 两个参考风格包 | Apple 与 X 可用，但默认不启用。 |
| `首个成功体验` 卡片 | 面板提供了可复制的第一次评审提示词。 |

起始记录只会在本地品味库为空时创建；安装或升级插件不会覆盖已有 profile。

## 3. 运行真实的 60 秒对话演示

对话步骤会使用 Harness 里选中的模型，所以先确保提供方凭据有效，然后在新对话粘贴：

> 调用 `palate_stats`，然后用 `palate_review` 评审“一个有 12 张等权 KPI 卡、一个主要营收指标和一张小趋势图的分析仪表盘”。告诉我用了哪些已存的原则和案例，并返回 `review_id`。

成功回复应包含：

- 一个 `review_id`；
- 至少一条具体的已存原则；
- 相关的好/坏起始案例，而不是无关的最近记录。

面板下一次刷新后也应出现这次评审。如果对话提示鉴权失败，但面板仍显示本地计数，说明插件已经安装成功，剩下的是 Harness 提供方凭据问题。

## 4. 看见学习闭环

只有在你真实判断过评审后，才记录反馈。可以让 agent 做一个安全的本地优先流程：

1. 用 `palate_add` 添加一个仪表盘反例；
2. 用 `palate_review` 评审同一个仪表盘；
3. 你判断建议是否有用后，再调用 `palate_feedback`。

`palate_add` 会改变例子数量；原则有效性只有在明确反馈后才会变化。要训练截图或 URL，先用浏览器或视觉能力真实检查来源，再调用 `palate_intake`；候选会保持待确认，直到你明确选择后才调用 `palate_decide`。

## 排障对照表

| 现象 | 说明 | 下一步 |
| --- | --- | --- |
| 看不到眼睛按钮 | Web 宿主还没有加载 client bundle。 | 确认 `dsh plugin --profile web list dsh-palate`，重启 `dsh web`，再刷新。 |
| 有眼睛按钮和本地计数，但对话鉴权失败 | 插件和本地存储正常；当前模型没有有效凭据。 | 修好 Harness 提供方配置后重试提示词。 |
| 面板提示读不到本地数据 | loopback 路由不可用，或宿主仍在重启。 | 重启 `dsh web`，等它就绪后刷新一次。 |
| `pnpm demo` 在 PASS 之前失败 | checkout、构建或 Node 环境问题。 | 确认 Node ≥ 22，执行 `pnpm install` 后重试。 |

这个 demo 不会索取、打印或验证任何密钥。提供方凭据应保存在 Harness profile 中，不要写进仓库。
