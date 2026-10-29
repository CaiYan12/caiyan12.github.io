/**
 * 「用户偏好减少动效」的单一判定点（#117/T2）。
 *
 * 收敛前三份逐字相同的局部副本：theme-script.ts（模块级）、
 * article-toc.ts（模块级）、quote-band.ts（initQuoteBand 闭包内，每次 init 重建）。
 *
 * 语义必须是**每次调用即时查询**：matchMedia 的 .matches 会随系统设置变化，
 * 用户可在会话中途改偏好，所以此处只导出函数、不缓存成模块加载时的常量。
 * 函数体在调用时才读 window，模块顶层不接触任何浏览器全局——node 环境
 * `import` 本模块不抛错（导入无副作用，与本目录既有模块的纯函数约定一致）。
 */
export const prefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;
