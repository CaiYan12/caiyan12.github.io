/**
 * 站点全局配置（对应 Emlog 后台设置 + Colorful 主题 options.php）
 */
import giscusSync from "./data/giscus-sync.json";

export const siteConfig = {
	/** 站点标题 */
	title: "WindowsIt's Music Club",
	/** 副标题/描述 */
	subtitle: "音乐、代码与生活 —— WindowsIt 的个人博客",
	/** 站点 URL（GitHub Pages 用户站点） */
	siteURL: "https://caiyan12.github.io",
	/** GitHub 用户名（构建期统计、项目统计卡等处引用，避免散落硬编码） */
	githubUser: "CaiYan12",
	/** 站点关键词 */
	keywords: "博客,音乐,WindowsIt,技术,生活",
	/** 作者名 */
	author: "WindowsIt",
	/** 头像路径 */
	avatar: "/images/avatar.webp",
	/** Colorful 桌面端圆形站点标志（对应 options.php 的 logo） */
	desktopLogo: "/images/avatar.webp",
	/** 时区 */
	timezone: "Asia/Shanghai",
	/** 语言 */
	lang: "zh_CN",
	/** 建站时间（用于 footer 运行天数） */
	foundationTime: "2026-01-01",
	/** 每页文章数 */
	postsPerPage: 6,
	/** 标签页每页文章数（单标签页头部含标签药丸云，初始 5，远期随标签增长调整） */
	tagPostsPerPage: 5,
	/** 首页摘要字数 */
	excerptLength: 120,
	/** 站点备案号（可留空） */
	icp: "",
	/** 页脚附加信息 */
	footerInfo: "Powered by Astro & Colorful",
};

/** 高分辨率都市背景；来源记录见 public/images/bg/PEXELS-SOURCES.md */
export const backgroundConfig = {
	images: [
		"/images/bg/pexels-65441.jpg",
		"/images/bg/pexels-5981771.jpg",
		"/images/bg/pexels-8561543.jpg",
		"/images/bg/pexels-30123516.jpg",
	],
};

/** 导航栏配置（对应 Emlog 后台自定义导航 + Colorful 附加功能菜单） */
export const navBarConfig = {
	items: [
		{ name: "首页", url: "/" },
		{ name: "微言碎语", url: "/diary/" },
		{ name: "留言板", url: "/guestbook/" },
	],
	/** 文章归档下拉菜单 */
	archiveSite: [
		{ name: "全部文章", url: "/archive/" },
		{ name: "标签分类", url: "/tag/" },
		{ name: "文章分类", url: "/category/" },
		{ name: "热门推荐", url: "/hot/" },
	],
	/** 关于本站下拉菜单 */
	aboutSite: [
		{ name: "关于站长", url: "/about/" },
		{ name: "我的技能", url: "/skills/" },
		{ name: "时间线", url: "/timeline/" },
		{ name: "友情链接", url: "/friends/" },
	],
	/** 附加功能下拉菜单（对应原主题"附加功能"，仅收与主菜单不重复的项） */
	extra: [
		{ name: "相册图库", url: "/albums/" },
		{ name: "图片墙", url: "/images/" },
	],
	/** 本站资源下拉菜单 */
	resourceSite: [
		{ name: "我的项目", url: "/projects/" },
		{ name: "AI日报", url: "/ai-news/", noSwup: true },
		{ name: "每日好书", url: "/books/", noSwup: true },
	],
	/** 右侧图标导航 */
	social: {
		bilibili: {
			show: true,
			id: "318867223",
			url: "https://space.bilibili.com/318867223",
		},
		qq: { show: true, id: "2265426573", image: "/images/qq-qrcode.jpg" },
		wechat: { show: true, image: "/images/wechat-qrcode.jpg" },
		rss: { show: true, url: "/rss.xml" },
	},
};

/** 侧栏小部件配置（对应 Emlog 后台 widgets1 排序） */
export const sidebarConfig = {
	/** 依次显示的小部件（hotlog 仅首页显示、related 仅文章页显示，由各自组件按 URL 判断） */
	widgets: [
		"blogger",
		"search",
		"sort",
		"tag",
		"archive",
		"newlog",
		"hotlog",
		"related",
		"newcomm",
		"link",
		"twitter",
	],
};

/** 文章版权声明（对应 echo_log.php 的 post-lisence，由 components/misc/License.astro 读取） */
export const licenseConfig = {
	/** 是否在文章页显示版权协议链接（关闭时仅显示原始版权文案） */
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh",
};

/** Giscus 评论配置（repo/category/categoryId 共享自 src/data/giscus-sync.json，供 Node 同步脚本复用） */
export const commentConfig = {
	enable: true,
	...giscusSync,
	repoId: "R_kgDOUJeNhw",
	mapping: "pathname",
	reactionsEnabled: "1",
	emitMetadata: "0",
	inputPosition: "bottom",
	lang: "zh-CN",
	theme: `${siteConfig.siteURL}/giscus-theme.css`,
};

/** 幻灯片配置（对应 options.php 的 index_slide，仅首页显示） */
export const slideshowConfig = {
	enable: true,
	interval: 4000,
	// 图片路径（原主题 images/slide/slide-1.jpg ... slide-5.jpg）
	slides: [
		{ image: "/images/slide/slide-1.jpg" },
		{ image: "/images/slide/slide-2.jpg" },
		{ image: "/images/slide/slide-3.jpg" },
		{ image: "/images/slide/slide-4.jpg" },
		{ image: "/images/slide/slide-5.jpg" },
	],
};

/** Pio Live2D 看板娘配置（迁移自 mizuki） */
export const pioConfig = {
	/** 是否启用看板娘 */
	enable: true,
	/** Live2D 模型配置文件路径 */
	models: ["/pio/models/pio/model.json"],
	/** 桌面端固定位置 */
	position: "left" as const,
	/** Canvas 尺寸 */
	width: 280,
	height: 250,
	/** 固定在视口底部，避免拖拽后模型下沿脱离底部基线 */
	mode: "fixed" as const,
	/** 旧项目以 1280px 为移动端隐藏断点 */
	hiddenOnMobile: true,
	dialog: {
		// 站名引用 siteConfig.title，避免第二副本漂移
		welcome: `欢迎来到 ${siteConfig.title}！`,
		touch: [
			"你在做什么呀？",
			"不要一直戳我啦！",
			"HENTAI!",
			"不要这样欺负我呀！",
		],
		home: "点击这里返回首页！",
		skin: ["想看看我的新衣服吗？", "新衣服很好看吧～"],
		close: "QWQ 下次再见啦～",
		link: "https://github.com/Dreamer-Paul/Pio",
	},
};

/** 明月浩空音乐播放器配置（授权域名：caiyan12.github.io） */
export const myhkwPlayerConfig = {
	/** 是否启用播放器 */
	enable: true,
	/** 控制台注册的播放器 ID，同时作为嵌入代码的 key */
	playerId: "178815680112",
	/** 经典皮肤 */
	skin: "player",
	/** 左侧浮窗（与 Pio 同侧，层级由 Layout.astro 覆盖） */
	position: "left" as const,
	/** 允许移动端加载 */
	mobile: true,
} as const;

/** 樱花环境动效配置（迁移自 mizuki） */
export const sakuraConfig = {
	enable: true,
	sakuraNum: 11,
	size: { min: 0.5, max: 1.1 },
	opacity: { min: 0.3, max: 0.9 },
	speed: {
		horizontal: { min: -1.7, max: -1.2 },
		vertical: { min: 1.5, max: 2.2 },
		rotation: 0.03,
		fadeSpeed: 0.03,
	},
	zIndex: 51,
};

/** 页脚信息（对应 footer.php） */
export const footerConfig = {
	showRuntime: true,
	showEmlogCredit: false,
};
