---
title: "Mock 测试：Markdown 内容增强"
published: 2026-08-31 12:00:00
category: "习题"
tags: ["mock", "markdown"]
description: "private mock 文章：验证 Callouts、GitHub 卡片、图片网格、外链处理、邮箱保护与版权声明。"
private: true
---

本文为 private mock 测试文章（`private: true`，不出现在任何列表，仅可通过直链访问），用于验证 Markdown 内容增强功能。

## Callouts 提醒块

容器指令语法（`:::tip[标题]`）：

:::tip[容器指令提示]
这是 `:::tip` 容器指令产生的 admonition 提醒块，支持 **Markdown** 行内格式。
:::

:::warning[容器指令警告]
这是 `:::warning` 容器指令，黄色警示风格。
:::

GitHub 风格 alerts 语法（`> [!NOTE]`）：

> [!NOTE]
> 这是 GitHub 风格 alert（note），蓝色左边框。

> [!CAUTION]
> 这是 GitHub 风格 alert（caution），红色左边框。

## GitHub 仓库卡片

::github{repo="CaiYan12/windy-project-mgr"}

::github{repo="matsuzaka-yuki/Mizuki"}

## 图片网格

4 图网格（自动 4 列）：

[grid]
![测试图 1](/images/random/tb1.jpg)
![测试图 2](/images/random/tb2.jpg)
![测试图 3](/images/random/tb3.jpg)
![测试图 4](/images/random/tb4.jpg)
[/grid]

2 图网格（自动 2 列）：

[grid]
![测试图 5](/images/random/tb5.jpg)
![测试图 6](/images/random/tb6.jpg)
[/grid]

带链接的图片也可进网格：

[grid]
[![点击跳转首页](/images/random/tb7.jpg)](/)
[![普通图片](/images/random/tb8.jpg)](https://github.com/CaiYan12)
[/grid]

## 外链处理

外链（应自动加 `target="_blank"` 与 `rel="noopener noreferrer"`）：

- [Astro 官方文档（外链）](https://docs.astro.build/)
- [GitHub（外链）](https://github.com/)

站内链接（不加 `target`）：

- [返回首页（站内）](/)

## 邮箱保护

点击下方链接时才会解码出真实邮箱（HTML 中只有 base64 串）：

[联系站长（mailto 保护）](mailto:mock-test@example.com)

## Spoiler 文本指令（已有功能回归测试）

这篇文章里藏了一个 :spoiler[神秘的剧透内容]，点击才能看到。

## 版权声明

本页底部 `.post-lisence` 区域应显示带 CC BY-NC-SA 4.0 链接的版权声明（由 `licenseConfig` 驱动）。
