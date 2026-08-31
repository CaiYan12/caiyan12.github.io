---
title: 《Linux操作系统》课程练习题3：基本操作
published: 2026-03-18
description: 'Linux操作系统基本操作习题'
image: /images/posts/202603181619.jpg
tags: [习题,Linux操作系统]
category: '习题'
views: 0
comments: 0
hotness: 0
draft: false
---

## 一、填空题

1．在Linux操作系统中，命令**区分**大小写。在命令行中，可以使用**Tab**键来自动补齐命令。

2．如果要在一个命令行上输入和执行多条命令，可以使用 **;（分号）** 来分隔命令。

3．断开一个长命令行，可以使用**\（反斜杠）**，以将一个较长的命令分成多行表达，增强命令的可读性。执行后，shell自动显示提示符**>**，表示正在输入一个长命令。

4．要使程序以后台方式执行，只需在要执行的命令后跟上一个**&**符号。

## 二、选择题

1．（C）命令能用来查找文件TESTFILE中包含4个字符的行。

A．`grep '???? ' TESTFILE`<br>
B．`grep '…. ' TESTFILE`<br>
C．`grep '^????$' TESTFILE`<br>
D．`grep '^….$ ' TESTFILE`

`^????$` 表示**整行恰好4个字符**。

2．（B）命令用来显示/home及其子目录下的文件名。

A．`ls -a /home`<br>
B．`ls -R /home`<br>
C．`ls -l /home`<br>
D．`ls -d /home`

`ls -R` 表示递归列出所有子目录

3．如果忘记了ls命令的用法，可以采用（C）命令获得帮助。

A．`？ls`<br>
B．`help ls`<br>
C．`man ls`<br>
D．`get ls`

`man ls` 是标准帮助命令

4．查看系统当中所有进程的命令是（D）。

A．`ps all`<br>
B．`ps aix`<br>
C．`ps auf`<br>
D．`ps aux`

`ps aux` 查看所有进程（最常用）

5．Linux中有多个查看文件的命令，如果希望在查看文件内容过程中通过上下移动光标来查看文件内容，则下列符合要求的命令是（C）。

A．`cat`<br>
B．`more`<br>
C．`less`<br>
D. `head`

`less` 支持上下滚动（比more强）

6．（D）命令可以了解当前目录下还有多大空间。

A．`df`<br>
B．`du /`<br>
C．`du .`<br>
D．`df .`

`df .` 查看当前目录所在分区剩余空间

7．假如需要找出 /etc/my.conf 文件属于哪个包，可以执行（C）命令。

A．`rpm -q /etc/my.conf`<br>
B．`rpm -requires /etc/my.conf`<br>
C．`rpm -qf /etc/my.conf`<br>
D．`rpm -q | grep /etc/my.conf`

`rpm -qf 文件` → 查询文件属于哪个包

8．在应用程序启动时，（B）命令用于设置进程的优先级。

A．`priority`<br>
B．`nice`<br>
C．`top`<br>
D．`setpri`

`nice` 用于启动时设置优先级

9．（C）命令可以把f1.txt复制为f2.txt。

A．`cp f1.txt | f2.txt`<br>
B．`cat f1.txt | f2.txt`<br>
C．`cat f1.txt > f2.txt`<br>
D．`copy f1.txt | f2.txt`

`cat f1.txt > f2.txt` 重定向复制

10．使用（B）命令可以查看Linux的启动信息。

A．`mesg –d`<br>
B．`dmesg`<br>
C．`cat /etc/mesg`<br>
D．`cat /var/mesg`

`dmesg` 查看系统启动日志

## 三、简答题

### 1．more和less命令有何区别？

**共同点：** 都是用于分页查看文件内容。

**区别：**

| 特性     | more     | less   |
| -------- | -------- | ------ |
| 向前翻页 | 支持     | 支持   |
| 向后翻页 | ❌ 不支持 | ✅ 支持 |
| 搜索功能 | 有限     | 更强   |
| 使用体验 | 较简单   | 更灵活 |

👉 总结：**less 是 more 的增强版**

### 2．Linux操作系统下对磁盘的命名原则是什么？

Linux采用**统一设备文件命名规则**，一般在 `/dev` 目录下：

#### （1）基本格式

```
/dev/设备名
```

#### （2）常见磁盘命名

**① SATA / SCSI 磁盘**

```
/dev/sda      → 第一块硬盘
/dev/sdb      → 第二块硬盘
```

**② 分区表示**

```
/dev/sda1     → 第一块硬盘第1个分区
/dev/sda2     → 第2个分区
```

#### （3）NVMe 固态硬盘

```
/dev/nvme0n1       → 第一块NVMe盘
/dev/nvme0n1p1     → 第1分区
```

#### （4）命名规律总结

- 磁盘：`sd[a-z]`
- 分区：`数字编号`
- NVMe：`nvmeXnYpZ`

👉 本质原则：**按设备类型 + 编号 + 分区号命名**
