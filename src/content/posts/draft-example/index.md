---
title: 草稿示例
published: 2022-07-01
description: 这是一篇草稿，用于测试 draft 字段的隐藏行为。
tags: [Markdown, 草稿, 示例]
category: 示例
draft: true
---

# 这是一篇草稿

这篇文章目前处于**草稿**状态，尚未发布，因此不会对普通访客显示。内容仍在完善中，可能需要进一步编辑和审阅。

当文章准备好发布时，把 frontmatter 中的 `draft` 字段改为 `false` 即可：

```markdown
---
title: 草稿示例
published: 2024-01-11
tags: [Markdown, 草稿, 示例]
category: 示例
draft: false
---
```

**测试要点**：`draft: true` 的文章应满足——

- 不出现在首页文章列表
- 不出现在归档、分类、标签、侧栏、搜索、RSS 等任何公开位置
- 不构建对应的访问页面
