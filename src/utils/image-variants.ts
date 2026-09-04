// 响应式图片工具（TODO2：图片响应式与格式现代化）
//
// 从 @constants/image-manifest.json（由 scripts/generate-lqips.mjs 生成）查询
// public/images 原图的宽高与 WebP 变体档位，产出 <picture> 所需属性。
// 变体文件位于 public/images/_variants/（不入库），渲染前用 existsSync 兜底，
// 变体缺失时降级为裸 <img>（新克隆未跑脚本、或原图无变体均安全）。

import { existsSync } from "node:fs";
import { join } from "node:path";
import manifestData from "@constants/image-manifest.json";

interface ManifestEntry {
	width: number;
	height: number;
	variants: number[];
}

const manifest = manifestData as Record<string, ManifestEntry>;

export interface ResponsiveImageAttrs {
	/** 原图 URL（回退 src） */
	src: string;
	/** 原图格式 srcset（原图 + 各宽度档，供不支持 WebP 的浏览器选择） */
	srcset?: string;
	/** WebP 变体 srcset（供 <source type="image/webp"> 使用） */
	webpSrcset?: string;
	/** 原图宽度（防 CLS 的 width 属性） */
	width?: number;
	/** 原图高度（防 CLS 的 height 属性） */
	height?: number;
}

/** 相对路径转 URL（逐段 encodeURIComponent，保持与相册扫描器一致的编码方式） */
function toUrlPath(relPath: string): string {
	return relPath.split("/").map(encodeURIComponent).join("/");
}

/**
 * 查询图片的响应式属性。
 * @param src 图片 URL（/images/... 形式；encodeURIComponent 过的 URL 亦可）
 */
export function getResponsiveImage(src: string): ResponsiveImageAttrs {
	if (!src.startsWith("/")) return { src };

	let decoded = src;
	try {
		decoded = decodeURIComponent(src);
	} catch {
		/* 含孤立 % 等非法序列时保持原值 */
	}
	if (!decoded.startsWith("/images/")) return { src };

	const key = `public:${decoded.slice(1)}`;
	const entry = manifest[key];
	if (!entry) return { src };

	// 过滤出磁盘上真实存在的变体（manifest 入库但变体不入库，需兜底）
	const rel = decoded.slice("/images/".length);
	const widths = entry.variants.filter((w) =>
		existsSync(
			join(process.cwd(), "public/images/_variants", `${rel}.${w}w.webp`),
		),
	);
	if (widths.length === 0) return { src };

	const webpCandidates = widths.map(
		(w) => `/images/_variants/${toUrlPath(rel)}.${w}w.webp ${w}w`,
	);
	const origCandidates = [
		`${src} ${entry.width}w`,
		...widths.map(
			(w) => `/images/_variants/${toUrlPath(rel)}.${w}w.webp ${w}w`,
		),
	];

	return {
		src,
		srcset: origCandidates.join(", "),
		webpSrcset: webpCandidates.join(", "),
		width: entry.width,
		height: entry.height,
	};
}
