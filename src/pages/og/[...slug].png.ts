// 动态 OG 分享图（借鉴 Firefly 的 src/pages/og/[...slug].png.ts，MIT）
// 构建期为每篇文章生成 1200x630 分享卡片，供 og:image 引用；
// 配色对齐 Colorful 主题：白底 + 海洋绿 #00c000。
import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";
import type { APIContext, GetStaticPaths } from "astro";
import * as fs from "node:fs";
import dayjs from "dayjs";
import satori from "satori";
import { siteConfig } from "../../config";

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

type FontStyle = "normal" | "italic";
interface FontOptions {
	data: Buffer | ArrayBuffer;
	name: string;
	weight?: Weight;
	style?: FontStyle;
	lang?: string;
}

export const getStaticPaths: GetStaticPaths = async () => {
	const allPosts = await getCollection("posts");
	return allPosts
		.filter((post) => !post.data.draft)
		.map((post) => ({
			params: { slug: post.id },
			props: { post },
		}));
};

let fontCache: { regular: Buffer | null; bold: Buffer | null } | null = null;

// 构建期从 Google Fonts 拉取 Noto Sans SC（仅用于渲染 PNG，不随站点发布）；失败则降级为无字体
async function fetchNotoSansSCFonts() {
	if (fontCache) return fontCache;
	try {
		const cssResp = await fetch(
			"https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap",
		);
		if (!cssResp.ok) throw new Error("Failed to fetch Google Fonts CSS");
		const cssText = await cssResp.text();

		const getUrlForWeight = (weight: number) => {
			const blockRe = new RegExp(
				`@font-face\\s*{[^}]*font-weight:\\s*${weight}[^}]*}`,
				"g",
			);
			const match = cssText.match(blockRe);
			if (!match || match.length === 0) return null;
			const urlMatch = match[0].match(/url\((https:[^)]+)\)/);
			return urlMatch ? urlMatch[1] : null;
		};

		const regularUrl = getUrlForWeight(400);
		const boldUrl = getUrlForWeight(700);

		if (!regularUrl || !boldUrl) {
			console.warn(
				"Could not find font urls in Google Fonts CSS; falling back to no fonts.",
			);
			fontCache = { regular: null, bold: null };
			return { regular: null, bold: null };
		}

		const [rResp, bResp] = await Promise.all([
			fetch(regularUrl),
			fetch(boldUrl),
		]);
		if (!rResp.ok || !bResp.ok) {
			console.warn(
				"Failed to download font files from Google; falling back to no fonts.",
			);
			fontCache = { regular: null, bold: null };
			return { regular: null, bold: null };
		}

		const rBuf = Buffer.from(await rResp.arrayBuffer());
		const bBuf = Buffer.from(await bResp.arrayBuffer());
		fontCache = { regular: rBuf, bold: bBuf };
		return fontCache;
	} catch (err) {
		console.warn("Error fetching fonts:", err);
		fontCache = { regular: null, bold: null };
		return { regular: null, bold: null };
	}
}

// 读取头像并统一转为 PNG data URL（站点头像是 webp，先转码规避 satori 的 webp 兼容问题）
async function getAvatarPngDataUrl(): Promise<string> {
	const avatarPath = `./public${siteConfig.avatar}`;
	const sharp = (await import("sharp")).default;
	const pngBuffer = await sharp(fs.readFileSync(avatarPath))
		.resize(120, 120)
		.png()
		.toBuffer();
	return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

export async function GET({
	props,
}: APIContext<{ post: CollectionEntry<"posts"> }>) {
	const { post } = props;
	const { regular: fontRegular, bold: fontBold } =
		await fetchNotoSansSCFonts();
	const avatarBase64 = await getAvatarPngDataUrl();

	const description = post.data.description || post.data.excerpt;
	const pubDate = dayjs(post.data.published).format("YYYY年M月D日");

	// Colorful 品牌色：海洋绿 #00c000，白底卡片
	const primaryColor = "#00c000";
	const textColor = "#1f2937";
	const subtleTextColor = "#6b7280";
	const backgroundColor = "#ffffff";

	const template = {
		type: "div",
		props: {
			style: {
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: backgroundColor,
				fontFamily:
					'"Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
				padding: "60px",
			},
			children: [
				// 顶部：站点标志 + 站点名
				{
					type: "div",
					props: {
						style: {
							width: "100%",
							display: "flex",
							alignItems: "center",
							gap: "20px",
						},
						children: [
							{
								type: "img",
								props: {
									src: avatarBase64,
									width: 48,
									height: 48,
									style: { borderRadius: "10px" },
								},
							},
							{
								type: "div",
								props: {
									style: {
										fontSize: "32px",
										fontWeight: 600,
										color: subtleTextColor,
									},
									children: siteConfig.title,
								},
							},
						],
					},
				},
				// 中部：海洋绿竖条 + 标题 + 描述
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							flexGrow: 1,
							gap: "20px",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "flex-start",
									},
									children: [
										{
											type: "div",
											props: {
												style: {
													width: "10px",
													height: "68px",
													backgroundColor:
														primaryColor,
													borderRadius: "6px",
													marginTop: "14px",
												},
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "68px",
													fontWeight: 700,
													lineHeight: 1.2,
													color: textColor,
													marginLeft: "25px",
													display: "-webkit-box",
													overflow: "hidden",
													textOverflow: "ellipsis",
													lineClamp: 3,
													WebkitLineClamp: 3,
													WebkitBoxOrient: "vertical",
												},
												children: post.data.title,
											},
										},
									],
								},
							},
							description && {
								type: "div",
								props: {
									style: {
										fontSize: "30px",
										lineHeight: 1.5,
										color: subtleTextColor,
										paddingLeft: "35px",
										display: "-webkit-box",
										overflow: "hidden",
										textOverflow: "ellipsis",
										lineClamp: 2,
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									},
									children: description,
								},
							},
						],
					},
				},
				// 底部：头像 + 作者 | 日期
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							width: "100%",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "center",
										gap: "20px",
									},
									children: [
										{
											type: "img",
											props: {
												src: avatarBase64,
												width: 60,
												height: 60,
												style: { borderRadius: "50%" },
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "28px",
													fontWeight: 600,
													color: textColor,
												},
												children:
													post.data.author ||
													siteConfig.author,
											},
										},
									],
								},
							},
							{
								type: "div",
								props: {
									style: {
										fontSize: "28px",
										color: subtleTextColor,
									},
									children: pubDate,
								},
							},
						],
					},
				},
			],
		},
	};

	const fonts: FontOptions[] = [];
	if (fontRegular) {
		fonts.push({
			name: "Noto Sans SC",
			data: fontRegular,
			weight: 400,
			style: "normal",
		});
	}
	if (fontBold) {
		fonts.push({
			name: "Noto Sans SC",
			data: fontBold,
			weight: 700,
			style: "normal",
		});
	}

	const svg = await satori(template as unknown as import("react").ReactNode, {
		width: 1200,
		height: 630,
		fonts,
	});

	const sharp = (await import("sharp")).default;
	const png = await sharp(Buffer.from(svg)).png().toBuffer();

	return new Response(new Uint8Array(png), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
