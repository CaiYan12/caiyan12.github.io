import test from "node:test";
import assert from "node:assert/strict";
import githubProjects from "../constants/github-projects.json" with { type: "json" };
import { projectsData } from "./projects";

test("projectsData：真实快照全部进入目录，Pinned 顺序与快照一致", () => {
	assert.ok(projectsData.length > githubProjects.repositories.length);
	const pinnedSourceUrls = githubProjects.pinnedRepositories.map(
		(nameWithOwner) => `https://github.com/${nameWithOwner}`,
	);
	assert.deepEqual(
		projectsData
			.slice(0, pinnedSourceUrls.length)
			.map((project) => project.sourceCode),
		pinnedSourceUrls,
	);
	assert.equal(
		projectsData.filter((project) => project.sourceCode).length,
		githubProjects.repositories.length,
	);
	assert.ok(projectsData.some((project) => project.id === "windy-concert"));
	assert.ok(projectsData.some((project) => project.id === "feijiemgr"));
	assert.equal(
		projectsData.some((project) => project.id === "break-this-repo"),
		false,
	);
	assert.equal(
		projectsData.some((project) => project.id === "inspira-ui"),
		false,
	);
});

test("projectsData：自动项目不推断状态，人工项目保留策展字段", () => {
	const site = projectsData.find(
		(project) => project.id === "caiyan12.github.io",
	);
	assert.equal(site?.status, undefined);
	assert.equal(site?.dateDisplay, "created");
	assert.equal(site?.visitUrl, "https://caiyan12.github.io/");

	const manager = projectsData.find(
		(project) => project.id === "windy-project-mgr",
	);
	assert.equal(manager?.status, "completed");
	assert.equal(manager?.dateDisplay, "range");
	assert.deepEqual(manager?.techStack, [
		"Tauri",
		"Rust",
		"React",
		"TypeScript",
	]);
});
