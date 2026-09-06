// Skill data configuration file
// Used to manage data for the skill display page

export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category: "frontend" | "backend" | "database" | "tools" | "other";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: {
		years: number;
		months: number;
	};
	certifications?: string[];
	color?: string; // Skill card theme color
}

export const skillsData: Skill[] = [
	// Frontend Skills
	{
		id: "javascript",
		name: "JavaScript",
		description: "现代网页开发的核心编程语言，熟悉ES6+语法和常用框架。",
		icon: "logos:javascript",
		category: "frontend",
		level: "intermediate",
		experience: { years: 2, months: 2 },
		color: "#F7DF1E",
	},
	{
		id: "jquery",
		name: "jQuery",
		description:
			"快速、简洁的JavaScript库，简化HTML文档遍历、事件处理、动画和Ajax交互。",
		icon: "mdi:jquery",
		category: "frontend",
		level: "intermediate",
		experience: { years: 1, months: 4 },
		color: "#DEA310",
	},
	{
		id: "html5",
		name: "HTML5",
		description: "网页开发的基础，掌握HTML5和语义化标签。",
		icon: "mdi:language-html5",
		category: "frontend",
		level: "intermediate",
		experience: { years: 2, months: 6 },
		color: "#DB5E16",
	},
	{
		id: "css3",
		name: "CSS3",
		description: "网页开发的样式语言，掌握CSS3和响应式设计。",
		icon: "mdi:language-css3",
		category: "frontend",
		level: "intermediate",
		experience: { years: 2, months: 6 },
		color: "#1572B6",
	},
	{
		id: "bootstrap",
		name: "Bootstrap",
		description: "流行的前端框架，用于快速构建响应式网页。",
		icon: "mdi:bootstrap",
		category: "frontend",
		level: "beginner",
		experience: { years: 0, months: 1 },
		color: "#563D7C",
	},
	{
		id: "astro",
		name: "Astro",
		description:
			"本站的静态站点框架，负责内容集合、页面路由、静态构建与部署。",
		icon: "logos:astro",
		category: "frontend",
		level: "advanced",
		experience: { years: 0, months: 8 },
		color: "#FF5D01",
	},
	{
		id: "typescript",
		name: "TypeScript",
		description: "本站及多个前端、桌面项目使用的类型化开发语言。",
		icon: "logos:typescript",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 8 },
		color: "#3178C6",
	},
	{
		id: "vite",
		name: "Vite",
		description: "多个前端与桌面项目的开发服务器和构建工具。",
		icon: "logos:vite",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 2 },
		color: "#646CFF",
	},
	{
		id: "react",
		name: "React",
		description:
			"用于 Opia RSS Reader 与 Windy Project Manager 界面开发的组件框架。",
		icon: "logos:react",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		color: "#61DAFB",
	},
	{
		id: "vue3",
		name: "Vue 3",
		description: "用于飞捷 Web 门户与管理后台的页面和组件开发。",
		icon: "logos:vue",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 2 },
		color: "#42B883",
	},
	{
		id: "tailwindcss",
		name: "Tailwind CSS",
		description:
			"用于本站与 Opia RSS Reader 的界面样式、布局和响应式设计。",
		icon: "logos:tailwindcss",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 8 },
		color: "#06B6D4",
	},
	{
		id: "svelte",
		name: "Svelte",
		description: "本站通过 @astrojs/svelte 集成的交互组件技术。",
		icon: "logos:svelte",
		category: "frontend",
		level: "beginner",
		experience: { years: 0, months: 8 },
		color: "#FF3E00",
	},
	{
		id: "pinia",
		name: "Pinia",
		description: "飞捷 Web 门户与管理后台使用的 Vue 状态管理库。",
		icon: "logos:pinia",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 2 },
		color: "#FFD859",
	},
	{
		id: "element-plus",
		name: "Element Plus",
		description: "飞捷管理后台使用的 Vue 组件库。",
		icon: "ep:element-plus",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 2 },
		color: "#409EFF",
	},
	{
		id: "gsap",
		name: "GSAP",
		description: "飞捷 Web 门户用于页面进入、列表和交互动效的动画库。",
		icon: "logos:greensock",
		category: "frontend",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		color: "#88CE02",
	},

	// Backend Skills
	{
		id: "c/c++",
		name: "C/C++",
		description: "系统编程语言，熟悉C++标准库和面向对象编程。",
		icon: "mdi:language-cpp",
		category: "backend",
		level: "beginner",
		experience: { years: 1, months: 8 },
		color: "#00599C",
	},
	{
		id: "java",
		name: "Java",
		description: "企业级应用开发的语言，熟悉Java SE和Java EE。",
		icon: "mdi:language-java",
		category: "backend",
		level: "beginner",
		experience: { years: 0, months: 3 },
		color: "#E2231A",
	},
	{
		id: "python",
		name: "Python",
		description: "通用编程语言，熟悉Python标准库和常用框架。",
		icon: "mdi:language-python",
		category: "backend",
		level: "beginner",
		experience: { years: 0, months: 6 },
		color: "#3776AB",
	},
	{
		id: "rust",
		name: "Rust",
		description:
			"Windy Project Manager 的本地业务层，负责项目扫描、Git 信息和桌面操作。",
		icon: "logos:rust",
		category: "backend",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		color: "#DEA584",
	},
	{
		id: "nodejs",
		name: "Node.js",
		description: "当前站点与多个项目使用的脚本和开发工具运行环境。",
		icon: "logos:nodejs",
		category: "backend",
		level: "beginner",
		experience: { years: 0, months: 2 },
		color: "#339933",
	},

	// Database Skills
	{
		id: "mysql",
		name: "MySQL",
		description: "强大的关系型数据库管理系统，熟悉数据库设计和优化。",
		icon: "logos:mysql-icon",
		category: "database",
		level: "advanced",
		experience: { years: 0, months: 6 },
		color: "#4479A1",
	},
	{
		id: "sqlite",
		name: "SQLite",
		description:
			"Windy Media Center 本地曲库使用的持久化数据库，配合 QtSql 完成扫描结果存储。",
		icon: "logos:sqlite",
		category: "database",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		color: "#003B57",
	},

	// Tools
	{
		id: "git",
		name: "Git",
		description: "强大的分布式版本控制系统，熟悉常用命令和工作流程。",
		icon: "logos:git-icon",
		category: "tools",
		level: "intermediate",
		experience: { years: 1, months: 0 },
		color: "#F05032",
	},
	{
		id: "vscode",
		name: "VS Code",
		description:
			"轻量化且功能强大的代码编辑器，支持多种编程语言和扩展插件。",
		icon: "logos:visual-studio-code",
		category: "tools",
		level: "expert",
		experience: { years: 3, months: 6 },
		color: "#007ACC",
	},
	{
		id: "pycharm",
		name: "PyCharm",
		description: "专业的Python集成开发环境，支持智能代码补全和调试功能。",
		icon: "logos:pycharm",
		category: "tools",
		level: "beginner",
		experience: { years: 0, months: 4 },
		color: "#21D789",
	},
	{
		id: "anaconda",
		name: "Anaconda",
		description: "开源的Python发行版，包含了许多科学计算和数据分析的库。",
		icon: "mdi:code-block-tags",
		category: "tools",
		level: "beginner",
		experience: { years: 0, months: 6 },
		color: "#4C05F7",
	},
	{
		id: "linux",
		name: "Linux",
		description: "开源的操作系统，熟悉常用命令和服务器管理。",
		icon: "logos:linux-tux",
		category: "tools",
		level: "beginner",
		experience: { years: 1, months: 2 },
		color: "#FCC624",
	},
	{
		id: "photoshop",
		name: "Photoshop",
		description: "专业的图像处理软件，可进行UI设计和图片编辑。",
		icon: "logos:adobe-photoshop",
		category: "tools",
		level: "expert",
		experience: { years: 4, months: 5 },
		color: "#31A8FF",
	},
	{
		id: "electron",
		name: "Electron",
		description:
			"Opia RSS Reader 的 Windows 桌面运行时，支持 RSS 阅读与 Mini 挂件模式。",
		icon: "logos:electron",
		category: "tools",
		level: "advanced",
		experience: { years: 0, months: 1 },
		color: "#47848F",
	},
	{
		id: "tauri",
		name: "Tauri",
		description:
			"Windy Project Manager 的桌面应用运行时，通过 IPC 连接 React 界面与 Rust 本地层。",
		icon: "logos:tauri",
		category: "tools",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		color: "#FFC131",
	},
	{
		id: "qt6",
		name: "Qt 6",
		description:
			"Windy 系列桌面项目使用的跨平台框架，覆盖 Widgets、Qt Quick/QML、Multimedia 与 Sql。",
		icon: "logos:qt",
		category: "tools",
		level: "advanced",
		experience: { years: 0, months: 6 },
		color: "#41CD52",
	},
	{
		id: "cmake",
		name: "CMake",
		description:
			"Windy Media Center、WindyPics、WindyColourPicker 与媒体播放器项目的 C++ 构建系统。",
		icon: "devicon:cmake",
		category: "tools",
		level: "intermediate",
		experience: { years: 0, months: 6 },
		color: "#064F8C",
	},

	// Other Skills
	{
		id: "flstudio",
		name: "FL Studio",
		description: "或许是最熟练的应用了，能快速完成编曲和混音工作。",
		icon: "arcticons:fl-studio-mobile",
		category: "other",
		level: "expert",
		experience: { years: 6, months: 11 },
		color: "#E10098",
	},
	{
		id: "wechat-mini-program",
		name: "微信小程序",
		description:
			"飞捷无人机服务前端使用的原生微信小程序技术，连接远程 REST 后端。",
		icon: "mdi:wechat",
		category: "other",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		color: "#07C160",
	},
];

// Get skill statistics
export const getSkillStats = () => {
	const total = skillsData.length;
	const byLevel = {
		beginner: skillsData.filter((s) => s.level === "beginner").length,
		intermediate: skillsData.filter((s) => s.level === "intermediate")
			.length,
		advanced: skillsData.filter((s) => s.level === "advanced").length,
		expert: skillsData.filter((s) => s.level === "expert").length,
	};
	const byCategory = {
		frontend: skillsData.filter((s) => s.category === "frontend").length,
		backend: skillsData.filter((s) => s.category === "backend").length,
		database: skillsData.filter((s) => s.category === "database").length,
		tools: skillsData.filter((s) => s.category === "tools").length,
		other: skillsData.filter((s) => s.category === "other").length,
	};

	return { total, byLevel, byCategory };
};

// Get skills by category
export const getSkillsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return skillsData;
	}
	return skillsData.filter((s) => s.category === category);
};

// Get advanced skills
export const getAdvancedSkills = () => {
	return skillsData.filter(
		(s) => s.level === "advanced" || s.level === "expert",
	);
};

// Calculate average years of experience
export const getAverageExperience = () => {
	const totalMonths = skillsData.reduce((total, skill) => {
		return total + skill.experience.years * 12 + skill.experience.months;
	}, 0);
	const averageMonths = Math.round(totalMonths / skillsData.length);
	return {
		years: Math.floor(averageMonths / 12),
		months: averageMonths % 12,
	};
};
