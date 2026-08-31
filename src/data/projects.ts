// Project data configuration file
// Used to manage data for the project display page

export interface Project {
	id: string;
	title: string;
	description: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	liveDemo?: string;
	sourceCode?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	visitUrl?: string; // 添加前往项目链接字段
}

export const projectsData: Project[] = [
	{
		id: "windy-project-mgr",
		title: "Windy Project Manager",
		description:
			"Windows 本地优先的项目管理与信息聚合工具：卡片式展示项目、技术栈与 Git 状态，支持 Open / Run / Build 操作，MVP 已完成验收。",
		image: "",
		category: "desktop",
		techStack: ["Tauri", "Rust", "React", "TypeScript"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/windy-project-mgr",
		startDate: "2026-08-27",
		featured: true,
	},
	{
		id: "opia-rss-reader",
		title: "Opia RSS Reader",
		description:
			"Windows 桌面 AI 新闻 RSS 阅读器，默认订阅橘鸦AI早报；支持多源标签页、主题编辑器、Mini 挂件模式与插件扩展。",
		image: "",
		category: "desktop",
		techStack: ["Electron", "React", "TypeScript", "Tailwind CSS"],
		status: "in-progress",
		sourceCode: "https://github.com/CaiYan12/opia-rss-reader",
		startDate: "2026-08-19",
		featured: true,
	},
	{
		id: "feijiemgr",
		title: "飞捷管理后台",
		description:
			"基于 Vue 3、TypeScript、Vite、Element Plus 和 Pinia 构建的运营管理网站（私有仓库）。",
		image: "",
		category: "web",
		techStack: ["Vue 3", "TypeScript", "Element Plus", "Pinia", "Vite"],
		status: "completed",
		startDate: "2026-07-29",
		endDate: "2026-08-17",
	},
	{
		id: "windypics",
		title: "WindyPics",
		description: "一个轻量的本地图片查看器，基于 Qt 6.8 + C++17。",
		image: "",
		category: "desktop",
		techStack: ["Qt 6", "C++17"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/WindyPics",
		startDate: "2026-06-22",
		endDate: "2026-06-22",
	},
	{
		id: "windycolourpicker",
		title: "WindyColourPicker",
		description: "轻量的 Windows Fluent 风格取色器，基于 Qt 6。",
		image: "",
		category: "desktop",
		techStack: ["Qt 6", "C++"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/WindyColourPicker",
		startDate: "2026-04-26",
		endDate: "2026-08-06",
	},
	{
		id: "windynotepad",
		title: "WindyNotePad",
		description:
			"一款基于 Qt 的轻量级文本编辑器，采用暗色主题，专注于简洁与实用。",
		image: "",
		category: "desktop",
		techStack: ["Qt", "C++"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/WindyNotePad",
		startDate: "2026-04-25",
		endDate: "2026-04-25",
	},
	{
		id: "studentmsgmgr",
		title: "StudentMsgMgr",
		description:
			"学生信息管理桌面应用，支持增删改查与 CSV 导入导出（Excel 兼容）。",
		image: "",
		category: "desktop",
		techStack: ["Qt 6", "C++17", "MSVC"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/StudentMsgMgr",
		startDate: "2026-04-25",
		endDate: "2026-04-25",
	},
	{
		id: "windyqtmediaplayer",
		title: "WindyQtMediaPlayer",
		description: "一个简单的使用 Qt6 编写的媒体播放器。",
		image: "",
		category: "desktop",
		techStack: ["Qt 6", "C++"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/WindyQtMediaPlayer",
		startDate: "2026-03-28",
		endDate: "2026-06-21",
	},
	{
		id: "my-astro-blog",
		title: "My Astro Blog",
		description: "基于 Mizuki 主题的 Astro 个人博客。",
		image: "",
		category: "web",
		techStack: ["Astro"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/my-astro-blog",
		startDate: "2025-12-26",
		endDate: "2026-04-02",
	},
	{
		id: "linear-sheet",
		title: "linear_sheet",
		description: "C++ 数据结构练习：整型线性表的实现。",
		image: "",
		category: "other",
		techStack: ["C++"],
		status: "completed",
		sourceCode: "https://github.com/CaiYan12/linear_sheet",
		startDate: "2025-02-23",
		endDate: "2025-07-05",
	},
];

// Get project statistics
export const getProjectStats = () => {
	const total = projectsData.length;
	const completed = projectsData.filter(
		(p) => p.status === "completed",
	).length;
	const inProgress = projectsData.filter(
		(p) => p.status === "in-progress",
	).length;
	const planned = projectsData.filter((p) => p.status === "planned").length;

	return {
		total,
		byStatus: {
			completed,
			inProgress,
			planned,
		},
	};
};

// Get projects by category
export const getProjectsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return projectsData;
	}
	return projectsData.filter((p) => p.category === category);
};

// Get featured projects
export const getFeaturedProjects = () => {
	return projectsData.filter((p) => p.featured);
};

// Get all tech stacks
export const getAllTechStack = () => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => {
			techSet.add(tech);
		});
	});
	return Array.from(techSet).sort();
};
