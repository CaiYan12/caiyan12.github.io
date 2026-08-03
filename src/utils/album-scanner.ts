/**
 * 相册扫描：构建时扫描 public/images/albums/<相册名>/ 下的图片
 * 对应 Emlog 的 kl_album 插件，但改为纯静态目录驱动
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ALBUMS_ROOT = join(process.cwd(), "public", "images", "albums");
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

export interface Album {
	name: string;
	slug: string;
	cover: string;
	photos: { url: string; name: string }[];
}

export function scanAlbums(): Album[] {
	if (!existsSync(ALBUMS_ROOT)) return [];
	const albums = readdirSync(ALBUMS_ROOT, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((dir) => {
			const dirPath = join(ALBUMS_ROOT, dir.name);
			const photos = readdirSync(dirPath)
				.filter((f) => IMAGE_EXT.test(f))
				.sort()
				.map((f) => ({
					url: `/images/albums/${encodeURIComponent(dir.name)}/${encodeURIComponent(f)}`,
					name: f,
				}));
			return {
				name: dir.name,
				slug: encodeURIComponent(dir.name),
				cover: photos[0]?.url ?? "",
				photos,
			};
		})
		.filter((a) => a.photos.length > 0);
	return albums;
}
