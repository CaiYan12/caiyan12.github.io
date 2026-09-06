/**
 * Nice Books 三页共享入口（swup 架构关键）：
 * 三个 books 页面都加载本脚本——任何一页整页加载后即注册 astro:page-load
 * 监听器；swup 切页（包括首次进入从未整页加载过的页面）都由监听器驱动
 * 对应 init。各 init 自查本页元素：不存在即早退、不打守卫标记。
 * 不可依赖 SwupScriptsPlugin 执行新页脚本（实测 main 外的页面 module
 * 在 swup 导航后不会被执行——2026-09-06 书库空数据事故根因）。
 */

import { bindCoverFallback, syncHeaderNav } from "./shared";
import { initHome } from "./home";
import { initArchive } from "./archive";

function init(): void {
	syncHeaderNav(); // 页眉在 swup 容器外：切页后立即重算高亮（含详情页归入书库分支）
	bindCoverFallback();
	initHome();
	initArchive();
}

init();
document.addEventListener("astro:page-load", init);
