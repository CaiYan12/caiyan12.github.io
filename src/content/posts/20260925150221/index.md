---
title: "告别“开盲盒”写代码：给初学者的现代 AI 前端开发实战指南"
published: 2026-09-25 15:02:21
description: "为什么凭感觉让 AI 写前端总是翻车？本文用通俗大白话带你拆解 Matt Pocock 的工程精髓，搭建一套有理有据、所见即所得、零基础也能轻松驾驭的现代 UI 研发工作流。"
image: /images/posts/20260925150221/matt-pocock-skills-youtube-cover.jpg
tags: [AI编程, Vibe Coding, 工作流]
category: 技术
draft: false
private: false
views: 0
comments: 0
hotness: 0
---

_AI 时代工程方法论 · 面向初学者与独立创作者_

为什么凭感觉让 AI 写前端总是翻车？本文用通俗大白话带你拆解 Matt Pocock 的工程精髓，搭建一套有理有据、所见即所得、零基础也能轻松驾驭的现代 UI 研发工作流。

:::important[核心结论速递（给赶时间的读者）]
AI 写代码频频失控，不只是因为提问不够详细，也可能是缺少清晰的交付步骤。与其把许多规则和工具一次性塞进每个任务，不如按需要建立一套精简的协作骨架：**查清家底 → 盘问对齐 → 原型试吃 → 切片实现 → 视觉复审**。
:::

## 1. 从“凭感觉聊天”到“专业带技能”

最近一段时间，“**Vibe Coding**（氛围式编码）”成了技术圈常见的讨论主题。它的美好愿景是：你不需要在脑子里背诵几百个 API 或繁琐的框架语法，只要在聊天框里用日常语言向 AI 描述心中构想，AI 就能替你敲出可运行的代码。

然而，只要试过用这套方式去改写一个有模有样的网页，你大概率会经历以下令人抓狂的挫败时刻：

- **盲盒现象**：只说了一句“做个好看的读书卡片”，AI 却凭空发明了巨大的粉紫色渐变，和原项目格格不入。
- **顾头不顾尾**：刚修好了右边的搜索按钮，左侧原本好好的导航栏居然被它随手删空了，历史记忆支离破碎。
- **虚假的高效**：AI 拍着胸脯向你保证“代码已为您完美重构”，结果一刷新浏览器，控制台直接炸出一大片红字报错。

为什么会这样？没有规矩不成方圆。在没有任何约束的情况下，AI 就像一个拿着锯子和油漆桶的学徒：它不知道你房子的承重墙在哪里，也不知道地板是实木还是瓷砖，只能靠猜。

Matt Pocock 维护着一套开源的 [Agent Skills（智能体技能）](https://github.com/mattpocock/skills)，为编码代理提供可复用的工作流程说明。它把工程中的一些做法写成可按需调用的指导，而不是神秘算法或一份适用于所有任务的固定 SOP。相关视频：[《mattpocock/skills: A complete AI Coding workflow, end-to-end》](https://www.youtube.com/watch?v=M6mYodf0dJM)。

## 2. 新一代 AI 时代的心法：少即是多

一种常见的做法，是在项目里写一份极其庞大的“紧箍咒”文件：长期加载许多 Skills，塞满死板规则，还要求 AI 每次改一个按钮前先把整座图书馆通读一遍。

面对 GPT-6、Codex 与 Gemini 3 等新一代模型和工具，增加规则的数量并不自动带来更好的结果。OpenAI 关于 GPT-6 Astra 的[技能与提示建议](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)指出，过长的技能说明可能被截短，过多或相互矛盾的技能说明也会让模型更难选对技能；对仓库指令，应按任务需要指向相关资料，而不是要求每次都读完整套文档。Google 在[介绍 Gemini 3](https://blog.google/products-and-platforms/products/gemini/gemini-3-collection/)中说明了 Gemini 3 的发布时间；GPT-6 系列信息见 [OpenAI 模型指南](https://developers.openai.com/api/docs/guides/latest-model)。

> 对实际协作来说，与其预先塞入所有规则，不如让约束清楚、与当前任务相关，并在需要时再加载专门的指导。复杂任务中，过多无关上下文会增加噪声；具体效果仍应结合任务和实际结果判断。

:::warning[容易翻车的做法]

- 把大量 Skills 全部常驻开启
- 每次提问都写冗长 Prompt
- 强迫 AI 扫描与当前任务无关的项目文件
  :::

:::tip[更克制的做法]

- 按任务加载相关 Skills 和文档
- 让代码改动以现有代码、配置和实际渲染为依据
- 视觉方案尚未确定时，先做少量草稿供人比较，再决定实现方向
  :::

## 3. 告别翻车：现代 UI Agent 的五步工作法

下面是本文针对前端 UI 场景整理的**简化工作法**，不是 Matt Pocock 官方流程的逐字复述。它把查清项目现状、需求对齐、原型探索、切片实现和视觉验收串在一起。Matt Pocock 官方流程的具体步骤和分支可见[工作流说明](https://github.com/mattpocock/skills/blob/main/docs/engineering/ask-matt.md)；本站也有一篇[更详细的流程介绍](/posts/20260919135000/)。

1. **查清家底（Repo Grounding）——做饭先看冰箱食材**<br />
   动手写代码前，先查清必要的项目事实：排版规范是什么？有没有可复用的 Button 或 Card？真实数据结构是什么？改动以现有代码和配置为依据，避免凭空发明。

2. **需求对齐（Grill with Docs）——像好医生一样连环盘问**<br />
   先把目标问清楚，再开始改代码：“改动的核心动机是什么？”“哪些必须保留，哪些允许推翻？”讨论中形成的术语和关键决策可以记入 `CONTEXT.md`；难以回退且有真实取舍的决策再记录为 ADR，避免换个会话就丢失背景。

3. **草稿试吃（Prototype）——让肉眼参与拍板**<br />
   文字难以确定视觉结构时，先制作少量可运行草稿，例如侧边栏型、卡片流型或杂志型。草稿用来回答具体设计问题；选定方向后再实现生产代码，不必每个任务都先做多个原型。

4. **切片推进（Vertical Slice & Implement）——像切千层蛋糕一样垂直推进**<br />
   不一次性重写几十个文件，而是拆成小的端到端切片。例如先完成静态列表，再完成搜索，最后完成详情弹窗。每个切片覆盖所需的数据、界面和检查，逐步推进。

5. **双重质检（UI 视觉验收 + 代码复审）——工程与审美都要达标**<br />
   代码没有语法错误，不等于页面就好用、好看。除代码复审外，前端任务还应检查间距、移动端触控区域、加载与空状态等实际呈现。通过相应检查后再提交改动。

## 4. 开发者的三态心智模型

这是本文整理的三阶段视角，用来帮助安排协作顺序：

| 状态阶段               | 核心任务                                 | 阶段口号                         |
| ---------------------- | ---------------------------------------- | -------------------------------- |
| 1. 探索态（EXPLORE）   | 勘察现有代码、发问澄清需求、统一术语     | 搞清楚真实世界现在是什么         |
| 2. 试错态（PROTOTYPE） | 制作多种结构草稿、推演复杂交互状态       | 搞清楚理想的效果应该是什么       |
| 3. 交付态（SHIP）      | 切片任务拆解、严谨编码、视觉与代码双验收 | 把决定好的东西可靠地变成生产代码 |

## 5. 新手拿来即用的 AGENTS.md 极简配置

在项目根目录下创建 `AGENTS.md` 文件，下面是一份起步示例；实际使用时应按项目约定调整：

```md
# Project Core Directives

## 1. Grounding First

- Never guess component names, styles, or file paths.
- Always check existing routes, Tailwind classes, and design tokens before proposing UI changes.
- Minimal change: only modify what is necessary for the current task.

## 2. Decision & Alignment

- When requirement or scope is unclear, grill me with questions first.
- When visual structure or user interaction is uncertain, generate 2-3 interactive prototype variants for human review instead of assuming.
- Record key decisions into CONTEXT.md.

## 3. Implementation

- Implement feature via tracer-bullet vertical slices.
- Do not re-architect already decided plans.
- Run tests and visual verification checklist before concluding.
```

## 6. 写在最后：让 AI 成为真正的得力工匠

现代 AI 开发真正的生产力飞跃，从来不是“AI 敲键盘的速度比人快了多少倍”；而是通过清楚的规则和流程，减少 AI 在错误方向上写出大量代码的代价。

把繁杂的代码探索、类型检查和多方案原型试验交给 AI；而把我们最宝贵的心智留给审美裁决、业务权衡和方向把控。
