---
title: Markdown 扩展特性
published: 2024-05-01
description: 介绍本站支持的 Markdown 扩展语法：GitHub 卡片、提示块、剧透隐藏等。
tags: [示例, Markdown, 扩展]
category: 示例
draft: false
private: true
---

## GitHub 仓库卡片

可以添加动态加载 GitHub 仓库信息的卡片，页面加载时会从 GitHub API 拉取仓库信息。

::github{repo="matsuzaka-yuki/Mizuki"}

使用 `::github{repo="matsuzaka-yuki/Mizuki"}` 创建 GitHub 仓库卡片：

```markdown
::github{repo="matsuzaka-yuki/Mizuki"}
```

## 提示块（Admonitions）

支持以下提示块类型：`note` `tip` `important` `warning` `caution`

:::note
这是一条提示信息，用户在快速浏览时也应该注意到。
:::

:::tip
可选信息，帮助用户更顺利地完成任务。
:::

:::important
对用户成功至关重要的关键信息。
:::

:::warning
需要立即引起用户注意的关键内容，可能带来潜在风险。
:::

:::caution
某个操作可能带来的负面后果。
:::

### 基础语法

```markdown
:::note
这是一条提示信息。
:::

:::tip
这是一条建议信息。
:::
```

### 自定义标题

提示块的标题可以自定义：

:::note[自定义标题]
这是一条使用自定义标题的提示。
:::

```markdown
:::note[自定义标题]
这是一条使用自定义标题的提示。
:::
```

### GitHub 风格语法

> [!TIP]
> [GitHub 风格的 alert 语法](https://github.com/orgs/community/discussions/16925) 同样受支持。

```
> [!NOTE]
> GitHub 风格语法同样受支持。

> [!TIP]
> GitHub 风格语法同样受支持。
```

### 剧透隐藏（Spoiler）

你可以给文字添加剧透隐藏效果，文字本身也支持 **Markdown** 语法。

这里有个 :spoiler[隐藏的 **惊喜**]！

```markdown
这里有个 :spoiler[隐藏的 **惊喜**]！
```

**提示**：点击被黑色遮住的文字即可显示/隐藏。
