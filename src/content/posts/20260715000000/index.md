---
title: GitHub + Vercel 免费部署静态博客指南
published: 2026-07-15
category: 技术
tags: [Vercel, GitHub, 部署]
description: 把 Astro 静态博客部署到 GitHub + Vercel 的完整流程
views: 89
comments: 0
hotness: 1
private: true
---

这篇博客本身就是跑在 GitHub + Vercel 上的。这里记录一下部署流程，方便日后查阅。

## 步骤一：推送代码到 GitHub

```bash
git init
git add .
git commit -m "init: Astro blog"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

## 步骤二：导入 Vercel

1. 登录 [vercel.com](https://vercel.com)，点击 **New Project**
2. 选择 GitHub 仓库，Vercel 会自动识别 Astro 框架
3. 构建配置（一般无需手动改）：

| 配置项           | 值           |
| ---------------- | ------------ |
| Framework Preset | Astro        |
| Build Command    | `pnpm build` |
| Output Directory | `dist`       |

4. 点击 **Deploy**，等待构建完成即可

## 步骤三：配置评论系统（Giscus）

1. 在 GitHub 仓库 **Settings → Features** 开启 **Discussions**
2. 安装 [giscus app](https://github.com/apps/giscus)
3. 到 [giscus.app](https://giscus.app) 生成配置，填入 `src/config.ts` 的 `commentConfig`
4. 将 `commentConfig.enable` 改为 `true`

## 以后怎么写文章

每次写好文章后：

```bash
git add src/content/posts/
git commit -m "post: 新文章"
git push
```

Vercel 检测到 push 后会自动构建部署，大约 1 分钟就能上线。
