# 技能页图标

这些 SVG 与 `src/data/skills.ts` 的现有 Iconify 标识一一对应，保持原始图形与颜色，供技能页本地加载。未修改 SVG。`SOURCES.json` 记录各文件原始 URL、SHA-256、抓取时间，以及上游集合作者与许可信息；使用和分发须遵守对应许可，品牌标识仍属于其各自权利人。

集合许可（来源为 SOURCES.json 的 Iconify 元数据）：

- `logos`：Gil Barbara，CC0-1.0。
- `mdi`：Pictogrammers，Apache-2.0。
- `ep`：Element Plus，MIT。
- `devicon`：konpa，MIT。
- `arcticons`：Donnnno / Arcticons，CC-BY-SA-4.0；`arcticons/fl-studio-mobile.svg` 按该许可提供，来源与作者链接见 SOURCES.json。

`licenses/` 保留上游许可/署名文件；MDI 的上游摘要另配完整 `Apache-2.0.txt`。许可文件的来源与 SHA-256 见 `LICENSE-SOURCES.json`。

`.gitattributes` 为原始 SVG 和许可正文关闭换行转换，`.prettierignore` 保持 SVG 原文，避免 Windows 检出或格式化破坏来源 hash。

手动刷新：`node scripts/sync-skill-icons.mjs`。只有明确要更新图形时运行，不加入普通构建链；访客和离线构建不访问 Iconify。新增技能时同步对应资源和来源记录。页面仍保留首字回退，以防本地资源损坏。
