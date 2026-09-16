export type ProjectCategory = "web" | "mobile" | "desktop" | "other";
export type ProjectStatus = "completed" | "in-progress" | "planned";

export interface GitHubProjectRepository {
	name: string;
	nameWithOwner: string;
	description: string | null;
	url: string;
	homepageUrl: string | null;
	primaryLanguage: string | null;
	topics: string[];
	createdAt: string;
}

export interface GitHubProjectsSnapshot {
	schemaVersion: 1;
	generatedAt: string;
	login: string;
	pinnedRepositories: string[];
	repositories: GitHubProjectRepository[];
}

export interface Project {
	id: string;
	title: string;
	description: string;
	category: ProjectCategory;
	techStack: string[];
	status?: ProjectStatus;
	sourceCode?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	visitUrl?: string;
	dateDisplay: "created" | "range";
}

export interface ProjectOverride {
	exclude?: boolean;
	id?: string;
	title?: string;
	description?: string;
	category?: ProjectCategory;
	techStack?: string[];
	status?: ProjectStatus;
	startDate?: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	visitUrl?: string;
}

export type ManualProject = Omit<Project, "dateDisplay">;

interface SortableProject {
	project: Project;
	pinnedIndex: number;
}

function techStackFrom(repository: GitHubProjectRepository): string[] {
	const values = [repository.primaryLanguage, ...repository.topics].filter(
		(value): value is string => Boolean(value),
	);
	const seen = new Set<string>();
	return values.filter((value) => {
		const key = value.toLocaleLowerCase("en-US");
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function compareIds(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function assertSnapshot(snapshot: GitHubProjectsSnapshot): void {
	if (
		!snapshot ||
		snapshot.schemaVersion !== 1 ||
		!Array.isArray(snapshot.repositories) ||
		!Array.isArray(snapshot.pinnedRepositories)
	) {
		throw new Error("invalid github-projects.json");
	}
}

export function resolveProjects(
	snapshot: GitHubProjectsSnapshot,
	overrides: Record<string, ProjectOverride>,
	manualProjects: ManualProject[],
): Project[] {
	assertSnapshot(snapshot);
	const pinnedOrder = new Map(
		snapshot.pinnedRepositories.map((name, index) => [name, index]),
	);
	const sortable: SortableProject[] = [];

	for (const repository of snapshot.repositories) {
		const override = overrides[repository.nameWithOwner] ?? {};
		if (override.exclude) continue;
		const hasCuratedTimeline = Boolean(
			override.startDate || override.endDate || override.status,
		);
		const project: Project = {
			id: override.id ?? repository.name.toLocaleLowerCase("en-US"),
			title: override.title ?? repository.name,
			description:
				override.description?.trim() ||
				repository.description?.trim() ||
				"暂无项目简介",
			category: override.category ?? "other",
			techStack: override.techStack ?? techStackFrom(repository),
			status: override.status,
			sourceCode: repository.url,
			startDate: override.startDate ?? repository.createdAt.slice(0, 10),
			endDate: override.endDate,
			featured: override.featured,
			tags: override.tags,
			visitUrl: override.visitUrl ?? repository.homepageUrl ?? undefined,
			dateDisplay: hasCuratedTimeline ? "range" : "created",
		};
		sortable.push({
			project,
			pinnedIndex:
				pinnedOrder.get(repository.nameWithOwner) ??
				Number.POSITIVE_INFINITY,
		});
	}

	for (const manual of manualProjects) {
		sortable.push({
			project: { ...manual, dateDisplay: "range" },
			pinnedIndex: Number.POSITIVE_INFINITY,
		});
	}

	const ids = new Set<string>();
	for (const { project } of sortable) {
		if (ids.has(project.id)) {
			throw new Error(`duplicate project id: ${project.id}`);
		}
		ids.add(project.id);
	}

	sortable.sort((left, right) => {
		if (left.pinnedIndex !== right.pinnedIndex) {
			return left.pinnedIndex - right.pinnedIndex;
		}
		if (left.project.startDate !== right.project.startDate) {
			return left.project.startDate > right.project.startDate ? -1 : 1;
		}
		return compareIds(left.project.id, right.project.id);
	});
	return sortable.map(({ project }) => project);
}
