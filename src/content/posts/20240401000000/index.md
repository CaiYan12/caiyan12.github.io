---
title: 博客使用指南
published: 2024-04-01
description: 如何使用本博客模板：文章目录结构、frontmatter 字段、封面图规则。
image: /images/guide-cover.png
tags: [博客, 定制, 指南]
category: 教程
draft: false
private: true
---

本博客基于 [Astro](https://astro.build/) 构建。指南中没有提到的内容，可以在 [Astro 官方文档](https://docs.astro.build/) 中找到答案。

## 文章的 Front-matter

```yaml
---
title: 我的第一篇博客
published: 2023-09-09
description: 这是新博客的第一篇文章。
image: /images/cover.jpg
tags: [Foo, Bar]
category: 前端
draft: false
---
```

### 字段说明

| 属性                 | 说明                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| `title`              | 文章标题（必填）                                                                    |
| `published`          | 发布日期（必填）                                                                    |
| `pinned`             | 是否置顶到文章列表顶部                                                              |
| `private`            | 是否为私密帖：隐藏于所有列表，但页面仍构建、可直接通过 URL 访问                     |
| `description`        | 文章简介，显示在首页列表                                                            |
| `image`              | 封面图路径：以 `/` 开头表示 `public` 目录下的图片；不填则自动按 slug 兜底随机缩略图 |
| `tags`               | 文章标签数组                                                                        |
| `category`           | 文章分类                                                                            |
| `author`             | 作者（默认 WindowsIt）                                                              |
| `draft`              | 是否为草稿，`true` 时不会显示                                                       |
| `views` / `comments` | 静态化的历史围观 / 吐槽数                                                           |
| `hotness`            | 0-5 整数，影响「热门推荐」排序                                                      |

## 文章文件放在哪里

文章文件放在 `src/content/posts/` 目录，目录名即 URL slug，必须为 14 位 `yyyymmddhhmmss`。可以用子目录来组织文章与资源：

```
src/content/posts/
├── 20260831153000/
│   ├── cover.png
│   └── index.md
└── 20260831153100/
    └── index.md
```

## Markdown 扩展语法

本站支持一些额外的 Markdown 语法（详见「Markdown 扩展特性」一文）：

- `:::note` 等 admonition 提示块
- `> [!TIP]` 等 GitHub 风格 alerts
- `:spoiler[内容]` 剧透隐藏
- `::github{repo="user/repo"}` GitHub 仓库卡片
- ```mermaid 代码块渲染图表

  ```

祝你写作愉快！
