<script lang="ts">
	/**
	 * 站内搜索：构建期 Pagefind 索引 + 运行时懒加载检索
	 */
	import { onMount } from "svelte";

	let keyword = "";
	let searching = false;
	let results: {
		url: string;
		title: string;
		excerpt: string;
		sub_results?: { url: string; title: string; excerpt: string }[];
	}[] = [];
	let error = "";
	let loaded = false;

	let pagefind: any = null;

	async function loadPagefind() {
		if (loaded || pagefind) return;
		loaded = true;
		try {
			const pagefindPath = "/pagefind/pagefind.js";
			pagefind = await import(/* @vite-ignore */ pagefindPath);
		} catch {
			// 开发模式没有索引，静默降级
		}
	}

	async function doSearch() {
		const kw = keyword.trim();
		if (!kw) {
			results = [];
			return;
		}
		searching = true;
		error = "";
		try {
			await loadPagefind();
			if (!pagefind) {
				error =
					"搜索索引未就绪（请先执行 pnpm build 生成 pagefind 索引）";
				searching = false;
				return;
			}
			const search = await pagefind.search(kw);
			const raw = search?.results ?? [];
			const items = await Promise.all(
				raw.slice(0, 12).map((r: any) => r.data()),
			);
			results = items.map((d: any) => ({
				url: d.url,
				title: d.meta?.title ?? "",
				excerpt: d.excerpt ?? "",
			}));
		} catch (e) {
			error = String(e);
		}
		searching = false;
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		doSearch();
	}

	onMount(() => {
		// 从 URL 参数预填关键词
		const params = new URLSearchParams(window.location.search);
		const kw = params.get("keyword");
		if (kw) {
			keyword = kw;
			doSearch();
		}
	});
</script>

<div class="search-panel">
	<form onsubmit={submit} class="flex gap-2">
		<input
			type="text"
			bind:value={keyword}
			aria-label="搜索关键词"
			placeholder="搜搜更健康"
			class="h-9 flex-1 rounded border border-line bg-white px-3 text-sm outline-none focus:border-primary"
		/>
		<button
			type="submit"
			class="h-9 rounded border border-black bg-primary px-4 text-sm text-white hover:bg-primarydark"
		>
			搜索
		</button>
	</form>

	{#if searching}
		<p class="mt-4 text-sm text-gray-500">正在搜索…</p>
	{/if}

	{#if error}
		<p class="mt-4 text-sm text-red-600">{error}</p>
	{/if}

	{#if !searching && !error && results.length === 0 && keyword.trim()}
		<p class="mt-4 text-sm text-gray-500">
			没有找到与「{keyword}」相关的内容，换个关键词试试？
		</p>
	{/if}

	<ul class="mt-4 space-y-4">
		{#each results as r}
			<li class="border-b border-dashed border-line pb-3">
				<a
					href={r.url}
					class="text-base text-primarydark hover:underline"
				>
					{r.title}
				</a>
				<p class="mt-1 text-sm leading-relaxed text-gray-600">
					{@html r.excerpt}
				</p>
			</li>
		{/each}
	</ul>
</div>
