/**
 * 站点全局配置（对应 Emlog 后台设置 + Colorful 主题 options.php）
 */

export const siteConfig = {
	/** 站点标题 */
	title: "WindowsIt's Music Club",
	/** 副标题/描述 */
	subtitle: "音乐、代码与生活 —— WindowsIt 的个人博客",
	/** 站点 URL（部署到 Vercel 后改成正式域名） */
	siteURL: "https://myblog-omega-pearl.vercel.app",
	/** 站点关键词 */
	keywords: "博客,音乐,WindowsIt,技术,生活",
	/** 作者名 */
	author: "WindowsIt",
	/** 头像路径 */
	avatar: "/images/avatar.png",
	/** Colorful 桌面端圆形站点标志（对应 options.php 的 logo） */
	desktopLogo: "/images/icon.png",
	/** 时区 */
	timezone: "Asia/Shanghai",
	/** 语言 */
	lang: "zh_CN",
	/** 建站时间（用于 footer 运行天数） */
	foundationTime: "2024-01-01",
	/** 每页文章数 */
	postsPerPage: 8,
	/** 首页摘要字数 */
	excerptLength: 120,
	/** 站点备案号（可留空） */
	icp: "",
	/** 页脚附加信息 */
	footerInfo: "Powered by Astro",
};

/** 导航栏配置（对应 Emlog 后台自定义导航 + Colorful 附加功能菜单） */
export const navBarConfig = {
	items: [
		{ name: "首页", url: "/", type: "home" },
		{ name: "文章归档", url: "/archive/", type: "archive" },
		{ name: "微言碎语", url: "/diary/", type: "diary" },
		{ name: "关于我", url: "/about/", type: "about" },
		{ name: "友情链接", url: "/friends/", type: "friends" },
		{ name: "留言板", url: "/guestbook/", type: "guestbook" },
	],
	/** 附加功能下拉菜单（对应原主题"附加功能"，仅收与主菜单不重复的项） */
	extra: [
		{ name: "相册图库", url: "/albums/" },
		{ name: "图片墙", url: "/images/" },
	],
	/** 是否显示"文章分类"下拉 */
	showCategoryDropdown: true,
	/** 右侧图标导航 */
	social: {
		weibo: { show: false, id: "", url: "" },
		qq: { show: false, id: "" },
		wechat: { show: false, image: "" },
		rss: { show: true, url: "/rss.xml" },
	},
};

/** 侧栏小部件配置（对应 Emlog 后台 widgets1 排序） */
export const sidebarConfig = {
	/** 依次显示的小部件 */
	widgets: [
		"blogger",
		"search",
		"sort",
		"tag",
		"archive",
		"newlog",
		"newcomm",
		"link",
		"twitter",
	],
};

/** 版权声明（对应 echo_log.php 的 post-lisence） */
export const licenseConfig = {
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh",
};

/** Giscus 评论配置（部署后填入真实仓库信息） */
export const commentConfig = {
	enable: false, // 配置好仓库后改为 true
	repo: "", // 格式: owner/repo
	repoId: "",
	category: "Announcements",
	categoryId: "",
	mapping: "pathname",
	reactionsEnabled: "1",
	emitMetadata: "0",
	inputPosition: "bottom",
	lang: "zh-CN",
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

/** 页脚信息（对应 footer.php） */
export const footerConfig = {
	showRuntime: true,
	showEmlogCredit: false,
};
