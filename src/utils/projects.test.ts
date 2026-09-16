import test from "node:test";
import assert from "node:assert/strict";
import {
	resolveProjects,
	type GitHubProjectsSnapshot,
	type ManualProject,
	type ProjectOverride,
} from "./projects";

function repository(
	name: string,
	createdAt: string,
	overrides: Partial<GitHubProjectsSnapshot["repositories"][number]> = {},
) {
	return {
		name,
		nameWithOwner: `CaiYan12/${name}`,
		description: `${name} description`,
		url: `https://github.com/CaiYan12/${name}`,
		homepageUrl: null,
		primaryLanguage: "TypeScript",
		topics: [],
		createdAt,
		...overrides,
	};
}

function snapshot(): GitHubProjectsSnapshot {
	return {
		schemaVersion: 1,
		generatedAt: "2026-09-16T00:00:00.000Z",
		login: "CaiYan12",
		pinnedRepositories: [
			"CaiYan12/caiyan12.github.io",
			"CaiYan12/opia-rss-reader",
			"CaiYan12/windy-project-mgr",
		],
		repositories: [
			repository("windy-concert", "2026-09-10T00:48:49Z"),
			repository("caiyan12.github.io", "2026-08-31T07:10:28Z", {
				homepageUrl: "https://caiyan12.github.io/",
				topics: ["blog", "typescript"],
			}),
			repository("windy-project-mgr", "2026-08-27T07:43:35Z", {
				description: null,
			}),
			repository("opia-rss-reader", "2026-08-19T07:48:02Z"),
		],
	};
}

const overrides: Record<string, ProjectOverride> = {
	"CaiYan12/opia-rss-reader": {
		title: "Opia RSS Reader",
		description: "人工中文简介",
		category: "desktop",
		techStack: ["Electron", "React", "TypeScript"],
		status: "in-progress",
		startDate: "2026-08-19",
	},
	"CaiYan12/windy-project-mgr": {
		description: "人工项目简介",
		category: "desktop",
		techStack: ["Tauri", "Rust", "React", "TypeScript"],
		status: "completed",
		startDate: "2026-08-27",
	},
};

const manualProjects: ManualProject[] = [
	{
		id: "feijiemgr",
		title: "飞捷管理后台",
		description: "私有仓库",
		category: "web",
		techStack: ["Vue 3", "TypeScript"],
		status: "completed",
		startDate: "2026-07-29",
		endDate: "2026-08-17",
	},
];

test("resolveProjects：Pinned 按 GitHub 顺序置顶，其余按开始时间倒序", () => {
	const projects = resolveProjects(snapshot(), overrides, manualProjects);
	assert.deepEqual(
		projects.map((project) => project.id),
		[
			"caiyan12.github.io",
			"opia-rss-reader",
			"windy-project-mgr",
			"windy-concert",
			"feijiemgr",
		],
	);
});

test("resolveProjects：人工字段覆盖 GitHub，私有项目保持原值", () => {
	const projects = resolveProjects(snapshot(), overrides, manualProjects);
	const opia = projects.find((project) => project.id === "opia-rss-reader");
	assert.equal(opia?.description, "人工中文简介");
	assert.equal(opia?.status, "in-progress");
	assert.equal(opia?.dateDisplay, "range");
	assert.deepEqual(opia?.techStack, ["Electron", "React", "TypeScript"]);

	const privateProject = projects.find(
		(project) => project.id === "feijiemgr",
	);
	assert.equal(privateProject?.sourceCode, undefined);
	assert.equal(privateProject?.endDate, "2026-08-17");
	assert.equal(privateProject?.dateDisplay, "range");
});

test("resolveProjects：新仓库用主语言与 Topics 回退，不推断状态", () => {
	const projects = resolveProjects(snapshot(), overrides, manualProjects);
	const site = projects.find(
		(project) => project.id === "caiyan12.github.io",
	);
	assert.deepEqual(site?.techStack, ["TypeScript", "blog"]);
	assert.equal(site?.status, undefined);
	assert.equal(site?.dateDisplay, "created");
	assert.equal(site?.visitUrl, "https://caiyan12.github.io/");

	const manager = projects.find(
		(project) => project.id === "windy-project-mgr",
	);
	assert.equal(manager?.description, "人工项目简介");
});

test("resolveProjects：null 或空白简介显示明确回退文案", () => {
	const data = snapshot();
	data.repositories[0].description = null;
	data.repositories[1].description = "   ";
	const projects = resolveProjects(data, overrides, []);
	assert.equal(
		projects.find((project) => project.id === "windy-concert")?.description,
		"暂无项目简介",
	);
	assert.equal(
		projects.find((project) => project.id === "caiyan12.github.io")
			?.description,
		"暂无项目简介",
	);
});

test("resolveProjects：排除表生效，且同日期按 id 稳定排序", () => {
	const data = snapshot();
	data.pinnedRepositories = [];
	data.repositories.push(repository("alpha", "2026-09-10T00:48:49Z"));
	const configuredOverrides = {
		...overrides,
		"CaiYan12/opia-rss-reader": { exclude: true },
	};
	const projects = resolveProjects(data, configuredOverrides, []);
	assert.equal(
		projects.some((project) => project.id === "opia-rss-reader"),
		false,
	);
	assert.deepEqual(
		projects.slice(0, 2).map((project) => project.id),
		["alpha", "windy-concert"],
	);
});
