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
	projects?: string[]; // Related project IDs
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
		projects: ["inspira-ui"],
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
		projects: ["inspira-ui"],
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
		projects: ["inspira-ui"],
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
		projects: ["inspira-ui"],
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
		projects: ["inspira-ui"],
		color: "#563D7C",
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
		projects: [],
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
		projects: [],
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
		projects: [],
		color: "#3776AB",
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
		projects: ["e-commerce-platform", "blog-system"],
		color: "#4479A1",
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
		projects: ["python-web-app", "data-analysis"],
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
		projects: [],
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
		projects: ["server-management", "shell-scripting"],
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
		projects: ["ui-design", "image-processing"],
		color: "#31A8FF",
	},

	// Other Skills
	{
		id: "flstudio",
		name: "FL Studio",
		description: "或许是最熟练的应用了，能快速完成编曲和混音工作。",
		icon: "mdi:tune",
		category: "other",
		level: "expert",
		experience: { years: 6, months: 11 },
		projects: ["modern-api"],
		color: "#E10098",
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

// Calculate total years of experience
export const getTotalExperience = () => {
	const totalMonths = skillsData.reduce((total, skill) => {
		return total + skill.experience.years * 12 + skill.experience.months;
	}, 0);
	return {
		years: Math.floor(totalMonths / 12),
		months: totalMonths % 12,
	};
};
