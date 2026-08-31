---
title: 《Linux操作系统》课程练习题2：基本概念
published: 2026-03-18
description: 'Linux操作系统基本概念习题'
image: /images/posts/202603181613.jpg
tags: [习题,Linux操作系统]
category: '习题'
views: 0
comments: 0
hotness: 0
draft: false
---

## 一、填空题

1．GNU的含义是**GNU's Not Unix!**。

2．Linux内核一般有3个主要部分：**内核**、**Shell**、**文件系统**。

3．目前被称为纯种的UNIX的就是**System V**及**BSD**这两套操作系统。

4．Linux是基于**GPL**的软件模式发布的，它是GNU项目制定的通用公共许可证，英文是**General Public License**。

5．斯托尔曼成立了自由软件基金会，它的英文是**FSF（Free Software Foundation）**。

6．POSIX是**Portable Operating System Interface**的缩写，重点在规范核心与应用程序之间的接口，这是由美国电气与电子工程师学会（Institute of Electrical and Electronics Engineers，IEEE）发布的一项标准。

7．当前的Linux常见的应用可分为**桌面应用**、**服务器应用**两个方面。

8．Linux的版本分为**内核版本**、**发行版本**两种。

9．安装Linux最少需要两个分区，分别是**根分区 (/)**、**交换分区 (swap)**。

10．Linux默认的系统管理员账号是**root**。

11．UEFI是**Unified Extensible Firmware Interface**的缩写，中文含义是**统一可扩展固件接口**。

12．NVMe是**Non-Volatile Memory express**的缩写，中文含义是**非易失性内存主机控制器接口规范**。

13．非易失性存储器标准硬盘是一种固态硬盘。`/dev/nvme0n1`表示第**1**个NVMe硬盘，`/dev/nvme0n2`表示第**2**个NVMe硬盘，而`/dev/nvme0n1p1`表示**第1个硬盘的第1个分区**，`/dev/nvme0n1p5`表示**第1个硬盘的第5个分区**，以此类推。

14．传统的基本输入输出系统（Basic Input Output System，BIOS）启动由于**MBR 分区表**的限制，默认是无法引导超过**2**TB以上的硬盘的。

15．如果选择的固件类型为“UEFI”，则Linux操作系统至少必须建立4个分区：**`/boot/efi`**、**`/boot`**、**`/`** (根分区)、**`swap`** (交换分区)。

## 二、选择题

1．Linux最早是由计算机爱好者（B）开发的。

A．Richard Petersen<br>
B．Linus Torvalds<br>
C．Rob Pick<br>
D．Linux Sarwar

**B**（Linus Torvalds 是 Linux 之父）

2．下列中（C）是自由软件。

A．Windows 10<br>
B．UNIX<br>
C．Linux<br>
D．Windows Server 2016

**C**（Linux 是典型的自由软件，其他为商业或闭源软件）

3．下列中（B）不是Linux的特点。

A．多任务<br>
B．单用户<br>
C．设备独立性<br>
D．开放性

**B**（Linux 是多用户、多任务系统）

4．Linux的内核版本2.3.20是（A）的版本。

A．不稳定<br>
B．稳定<br>
C．第三次修订<br>
D．第二次修订

**A**（旧版内核规则：次版本号为奇数表示开发版/不稳定版，偶数表示稳定版）

5．Linux安装过程中的硬盘分区工具是（D）。

A．PQmagic<br>
B．FDISK<br>
C．FIPS<br>
D．Disk Druid

**D**（Disk Druid 是 Red Hat 系列安装程序中常见的图形化分区工具）

6．Linux的根分区可以设置成（C）。

A．FATl6<br>
B．FAT32<br>
C．xfs<br>
D．NTFS

**C**（xfs 是 Linux 常用的日志文件系统，其余为 Windows 文件系统）
