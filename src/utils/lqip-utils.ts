// LQIP 模糊占位图查询工具（移植自 Firefly 的 src/utils/lqip-utils.ts，MIT）
// 方案来源: https://blog.cosine.ren/post/astro-lqip-implementation
//
// 从 @constants/lqips.json（由 scripts/generate-lqips.mjs 生成）查询图片的
// 三色渐变，返回内联 style；无数据或外部图片自动降级。

import lqipData from "@constants/lqips.json";

const lqips: Record<string, string> = lqipData as Record<string, string>;

const DEFAULT_GRADIENT =
	"linear-gradient(135deg, #d6d3d1 0%, #a8a29e 50%, #d6d3d1 100%)";

/**
 * 将 LQIP 紧凑格式（18 字符 hex）解码为 CSS 线性渐变
 * 格式：6e3b38ae7472af7574 → linear-gradient(135deg, #6e3b38 0%, #ae7472 50%, #af7574 100%)
 */
export function getLqipGradient(src: string): string | undefined {
	// 相册等处会输出 encodeURIComponent 后的 URL，先还原成磁盘原始路径再查 key
	let decoded = src;
	try {
		decoded = decodeURIComponent(src);
	} catch {
		/* 含孤立 % 等非法序列时保持原值 */
	}
	let compact: string | undefined;
	if (decoded.startsWith("/")) {
		// public 图片：key 格式为 public:xxx（去掉开头的 /）
		compact = lqips[`public:${decoded.slice(1)}`];
	} else {
		// src 图片：key 格式为 src:xxx
		compact = lqips[`src:${decoded}`] || lqips[decoded];
	}
	if (compact?.length !== 18) return undefined;
	const c1 = `#${compact.slice(0, 6)}`;
	const c2 = `#${compact.slice(6, 12)}`;
	const c3 = `#${compact.slice(12, 18)}`;
	return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
}

/** 判断是否为外部图片 */
export function isExternalImage(src: string): boolean {
	return (
		src.startsWith("http://") ||
		src.startsWith("https://") ||
		src.startsWith("data:")
	);
}

/** 获取 LQIP props（用于 Astro 组件），外部图片自动降级为默认渐变 */
export function getLqipProps(src: string): { style: string } {
	if (isExternalImage(src))
		return { style: `background: ${DEFAULT_GRADIENT}` };
	const gradient = getLqipGradient(src);
	return {
		style: gradient
			? `background: ${gradient}`
			: `background: ${DEFAULT_GRADIENT}`,
	};
}
