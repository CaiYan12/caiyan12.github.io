# 0009：AI 日报独立构建与发布

2026-10-28。替代 [0001](0001-ai-news-independent-react-page.md) 中主站统一构建和部署日报的决定；0001 保留为历史记录。

AI 日报迁至 [CaiYan12/ai-news](https://github.com/CaiYan12/ai-news)，由独立项目维护源码、测试与 Pages 发布；主站保留原路径的桌面、移动导航及 sitemap 条目。原地址保持 `/ai-news/`。主站与独立项目的完整导航通过部署后的同源浏览器旅程验收。

这是工程归属的变化。C-1 原定客户端瘦身方案被独立项目方案替代，性能目标转移至独立项目，未证明客户端资源瘦身或性能提升。恢复主站旧实现需要正常 revert 清理提交并重新部署，细节见 `docs/agents/build-and-deploy.md`。
