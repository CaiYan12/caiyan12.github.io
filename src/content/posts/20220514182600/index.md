---
title: 音色设计之为你的音色添加一个锋利的音头
published: 2022-05-14 18:26:00
description: "在很多EDM舞曲中，我们经常可以听到一种Click,Crispy的锋利的音色。这种音色的特点在于强烈的打击感的Punch音头，本篇文章将教你如何设计这种音头与运用这个方法做出一个Pluck音色。"
image: /images/posts/20220514182600/sylenth1-amp-env-adsr.png
category: 编曲知识
tags: [音乐, 混音, 作曲, 合成器, 电子音乐, 编曲, 音色]
draft: false
private: false
views: 0
comments: 0
hotness: 0
---

- 在很多EDM舞曲中，我们经常可以听到一种Click,Crispy的锋利的音色。这种音色的特点在于强烈的打击感的Punch音头，本篇文章将教你如何设计这种音头与运用这个方法做出一个Pluck音色。

---

## 方法一：使用音量包络ADSR

调整一个好的音色，ADSR功不可没。具体的ADSR原理、调整方法我会之后再写一篇文章。

我们还是以Sylenth1为例子，首先我们把Attack拉到最小，然后把Sustain调的低一些，然后根据实际情况调整Release，然后做一个短促的Decay。

![Sylenth1 的 AMP ENV A：A/D/S/R 四个滑杆](/images/posts/20220514182600/sylenth1-amp-env-adsr.png)

_如果你想做Lead那种以保持音为主的音色，而不是像Pluck这种的衰落音，可以拉高一点Sustain_

这样就相当于给你的音色做了一次整形，也直接决定了你的音色的性质。

而如果你已经有了一个音色基础，想在这个基础的音色上加一个音头，那么你可以在ENV里做一个原理相同的Volume ENV，只不过这次需要弄得非常短促。

![MOD ENV 1 指派为 Volume AB，包络极短促](/images/posts/20220514182600/sylenth1-mod-env-volume.png)

---

## 方法二：利用Cutoff包络做出击打感的Punch Pluck

注：此方法只对弹拨音色有用

首先我们需要在合成器中做一个低切的滤波器

![Sylenth1 的 FILTER A：低切滤波器](/images/posts/20220514182600/sylenth1-filter-lowcut.png)

在MOD ENV中，模式选择Cut Off，做一个相同原理的包络即可。

![MOD ENV 1 指派为 Cutoff AB](/images/posts/20220514182600/sylenth1-mod-env-cutoff.png)

---

## 方法三：快速的Pitch Down ENV音头

此方法为最常见的增加音头的方法，在各大舞曲风格中几乎均有体现，并通常与方法一联合使用。

我们只需要在MOD ENV中，模式选择Pitch，做一个相同原理的包络即可。

![MOD ENV 1 指派为 Pitch AB，Decay 极短](/images/posts/20220514182600/sylenth1-mod-env-pitch.png)

不过这次的Decay需要调的非常短，用Sylenth1的计算方法，通常在0~0.5之间，也就是通常不会调整超过5%。

---

如果你将上面这三个方法三合一，那么你将得到一个有着出色的音头的Pluck音色。但还是那句话，万物足量皆可毒，**绝对不能过量调整**。应以你的曲子为准，以调出**最适合**的音色为你的目标，而不是盲目地去拉这些旋钮。
