# Pexels 都市背景来源

以下照片用于网站随机背景（壁纸池），均从对应 Pexels 页面下载。

导出方式：原图放一个目录，跑 `pnpm build:bg -- --from <原图目录>`，按文件名产出同名 `.webp` 到 `public/images/bg/`；原图不入库。

口径：单张 ≤1.5MB、最长边 ≤2560px、WebP q80。判定由 `scripts/verify-background-assets.mjs` 在 `pnpm build` 的 `astro build` 之后执行（读产物里的 `data-backgrounds` 核对池→文件，再逐张核对字节与最长边）。

选图口径（2026-11-15 第二次筛选后确立）：**留白优先**——64×64 降采样后，8×8 块内标准差 <6 的「平滑块」占比 ≥45%；蓝青相（180–240°）≥55%；暖色（0–60°）≤30%；平均亮度 ≥35/255。俯瞰与「大天空 + 大水面 + 一条城市带」优先，整幅楼群塞满的构图（平滑块 <15%）直接排除。

| 文件                   | 作者                        | 来源                                                                                                | 原图                     | 导出后                |
| ---------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ | --------------------- |
| `pexels-65441.webp`    | Kaique Rocha                | https://www.pexels.com/photo/night-street-with-buildings-65441/                                     | 5263×3509 · 2,170,503 B  | 2560×1707 · 347,282 B |
| `pexels-5981771.webp`  | Lucas Pezeta                | https://www.pexels.com/photo/modern-city-street-with-road-at-night-time-5981771/                    | 5538×3692 · 3,240,350 B  | 2560×1707 · 485,416 B |
| `pexels-8561543.webp`  | Abdulwahab Alawadhi         | https://www.pexels.com/photo/modern-city-downtown-illuminated-at-night-8561543/                     | 4032×2268 · 895,240 B    | 2560×1440 · 270,618 B |
| `pexels-30123516.webp` | Mohammed Alim               | https://www.pexels.com/photo/kuala-lumpur-cityscape-during-blue-hour-30123516/                      | 9520×4810 · 10,044,667 B | 2560×1293 · 350,102 B |
| `pexels-29123790.webp` | dumitru bumbu               | https://www.pexels.com/photo/stunning-aerial-cityscape-of-seattle-at-twilight-29123790/             | 2560×1700 · 487,827 B    | 2560×1700 · 307,420 B |
| `pexels-33803475.webp` | K                           | https://www.pexels.com/photo/stunning-night-aerial-view-of-panama-city-lights-33803475/             | 2560×1440 · 563,154 B    | 2560×1440 · 406,994 B |
| `pexels-20208915.webp` | Johannes Plenio             | https://www.pexels.com/photo/skyline-of-a-modern-city-with-illuminated-buildings-at-night-20208915/ | 2560×1280 · 225,132 B    | 2560×1280 · 144,472 B |
| `pexels-28406822.webp` | Eslam Mohammed Abdelmaksoud | https://www.pexels.com/photo/stunning-night-skyline-of-abu-dhabi-cityscape-28406822/                | 2560×1707 · 395,765 B    | 2560×1707 · 251,472 B |
| `pexels-33803472.webp` | K                           | https://www.pexels.com/photo/panama-city-illuminated-skyline-at-night-33803472/                     | 2560×1440 · 384,564 B    | 2560×1440 · 264,356 B |
| `pexels-40323235.webp` | Indigo                      | https://www.pexels.com/photo/vibrant-night-cityscape-with-neon-lights-40323235/                     | 2560×1719 · 511,110 B    | 2560×1719 · 358,740 B |

2026-11-15 第一批：四张合计 16,305,760 B → **1,453,418 B**。

2026-11-15 第二批（+6 张）：按 CDN `w=2560` 下载（不是 Pexels 全尺寸原图，所以「原图」列是下载件），六张合计 2,567,552 B → **1,733,454 B**；池共 **10 张、3,186,872 B**。

第二批换过一次：初版六张（1449455 / 14970196 / 29422607 / 30136066 / 32445526 / 34947070）被站长否决——「内部信息太复杂、太多高楼，尤其最后一张不适合当背景」。按留白口径重筛后换成上表六张；其中 `34947070` 的平滑块占比只有 7%，是典型反例。
