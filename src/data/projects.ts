// /projects/ 的人工策展层：公开仓库基础信息来自构建期 GitHub 快照，
// 本文件只保留需要覆盖的展示字段和无法公开读取的私有项目。

import githubProjects from "../constants/github-projects.json" with { type: "json" };
import {
	resolveProjects,
	type GitHubProjectsSnapshot,
	type ManualProject,
	type ProjectOverride,
} from "../utils/projects";

const projectOverrides: Record<string, ProjectOverride> = {
	"CaiYan12/windy-project-mgr": {
		id: "windy-project-mgr",
		title: "Windy Project Manager",
		description:
			"Windows 本地优先的项目管理与信息聚合工具：卡片式展示项目、技术栈与 Git 状态，支持 Open / Run / Build 操作，MVP 已完成验收。",
		category: "desktop",
		techStack: ["Tauri", "Rust", "React", "TypeScript"],
		status: "completed",
		startDate: "2026-08-27",
		featured: true,
	},
	"CaiYan12/opia-rss-reader": {
		id: "opia-rss-reader",
		title: "Opia RSS Reader",
		description:
			"Windows 桌面 AI 新闻 RSS 阅读器，默认订阅橘鸦AI早报；支持多源标签页、主题编辑器、Mini 挂件模式与插件扩展。",
		category: "desktop",
		techStack: ["Electron", "React", "TypeScript", "Tailwind CSS"],
		status: "in-progress",
		startDate: "2026-08-19",
		featured: true,
	},
	"CaiYan12/WindyPics": {
		id: "windypics",
		title: "WindyPics",
		description: "一个轻量的本地图片查看器，基于 Qt 6.8 + C++17。",
		category: "desktop",
		techStack: ["Qt 6", "C++17"],
		status: "completed",
		startDate: "2026-06-22",
		endDate: "2026-06-22",
	},
	"CaiYan12/WindyColourPicker": {
		id: "windycolourpicker",
		title: "WindyColourPicker",
		description: "轻量的 Windows Fluent 风格取色器，基于 Qt 6。",
		category: "desktop",
		techStack: ["Qt 6", "C++"],
		status: "completed",
		startDate: "2026-04-26",
		endDate: "2026-08-06",
	},
	"CaiYan12/WindyNotePad": {
		id: "windynotepad",
		title: "WindyNotePad",
		description:
			"一款基于 Qt 的轻量级文本编辑器，采用暗色主题，专注于简洁与实用。",
		category: "desktop",
		techStack: ["Qt", "C++"],
		status: "completed",
		startDate: "2026-04-25",
		endDate: "2026-04-25",
	},
	"CaiYan12/StudentMsgMgr": {
		id: "studentmsgmgr",
		title: "StudentMsgMgr",
		description:
			"学生信息管理桌面应用，支持增删改查与 CSV 导入导出（Excel 兼容）。",
		category: "desktop",
		techStack: ["Qt 6", "C++17", "MSVC"],
		status: "completed",
		startDate: "2026-04-25",
		endDate: "2026-04-25",
	},
	"CaiYan12/WindyQtMediaPlayer": {
		id: "windyqtmediaplayer",
		title: "WindyQtMediaPlayer",
		description: "一个简单的使用 Qt6 编写的媒体播放器。",
		category: "desktop",
		techStack: ["Qt 6", "C++"],
		status: "completed",
		startDate: "2026-03-28",
		endDate: "2026-06-21",
	},
	"CaiYan12/my-astro-blog": {
		id: "my-astro-blog",
		title: "My Astro Blog",
		description: "基于 Mizuki 主题的 Astro 个人博客。",
		category: "web",
		techStack: ["Astro"],
		status: "completed",
		startDate: "2025-12-26",
		endDate: "2026-04-02",
	},
	"CaiYan12/linear_sheet": {
		id: "linear-sheet",
		title: "linear_sheet",
		description: "C++ 数据结构练习：整型线性表的实现。",
		category: "other",
		techStack: ["C++"],
		status: "completed",
		startDate: "2025-02-23",
		endDate: "2025-07-05",
	},
};

const manualProjects: ManualProject[] = [
	{
		id: "feijiemgr",
		title: "飞捷管理后台",
		description:
			"基于 Vue 3、TypeScript、Vite、Element Plus 和 Pinia 构建的运营管理网站（私有仓库）。",
		category: "web",
		techStack: ["Vue 3", "TypeScript", "Element Plus", "Pinia", "Vite"],
		status: "completed",
		startDate: "2026-07-29",
		endDate: "2026-08-17",
	},
];

export const projectsData = resolveProjects(
	githubProjects as GitHubProjectsSnapshot,
	projectOverrides,
	manualProjects,
);

export const getProjectStats = () => {
	const total = projectsData.length;
	const completed = projectsData.filter(
		(project) => project.status === "completed",
	).length;
	const inProgress = projectsData.filter(
		(project) => project.status === "in-progress",
	).length;
	const planned = projectsData.filter(
		(project) => project.status === "planned",
	).length;
	return { total, byStatus: { completed, inProgress, planned } };
};

export const getProjectsByCategory = (category?: string) => {
	if (!category || category === "all") return projectsData;
	return projectsData.filter((project) => project.category === category);
};

export const getFeaturedProjects = () =>
	projectsData.filter((project) => project.featured);

export const getAllTechStack = () => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => techSet.add(tech));
	});
	return Array.from(techSet).sort();
};
