---
title: 你好，Astro！博客迁移正式完成
published: 2026-07-28
category: 技术
tags: [Astro, 博客, 迁移]
description: 从 Emlog Colorful 主题迁移到 Astro 静态博客的完整记录
pinned: true
views: 328
comments: 12
hotness: 4
---

欢迎来到 **WindowsIt's Music Club** 的全新站点！

本站前身是基于 Emlog 博客程序、使用 Colorful（明月浩空）主题的经典博客。为了更快的加载速度、更好的安全性和更简单的部署，我们把它迁移到了 **Astro** 纯静态方案。

## 迁移技术栈

| 原方案 | 新方案 |
| ------ | ------ |
| PHP + MySQL | 纯静态 HTML |
| Pjax 无刷新 | Swup.js 页面过渡 |
| Emlog 自带搜索 | Pagefind 静态索引 |
| Emlog 评论 | Giscus（GitHub Discussions） |
| Highslide 灯箱 | Fancybox |
| jQuery 轮播 | 原生 JS 轮播 |

## 一些代码示例

迁移之后，代码高亮由 Expressive Code 提供：

```js
// 计算博客运行天数（对应原主题 footer 的"勉强运行"）
const days = Math.floor((Date.now() - new Date("2024-01-01")) / 86400000);
console.log(`博客已勉强运行 ${days} 天`);
```

再比如行内代码 `pnpm build` 和数学公式：

$$
E = mc^2
$$

## 迁移过程中的取舍

1. **IP 归属地显示**：静态站点没有服务端，无法查询访客 IP 位置，已移除
2. **用户注册**：博客以读为主，不再提供注册功能
3. **Flash 播放器**：2015 年的 Flash 时代已经结束，视频改用原生 HTML5
4. **相册插件**：改为纯文件夹驱动，在 `public/images/albums/` 下放图即可

希望新站点能给你带来更好的阅读体验。如果有任何建议，欢迎在留言板告诉我！
