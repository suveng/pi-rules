# pi-rules（AGENTS.md 裁剪版）

给 [pi coding agent](https://github.com/badlogic/pi-mono) 用的规则注入扩展：**读 / 改 / 写文件时，按目录向上回溯把沿途每一层的 `AGENTS.md` 注入上下文**，让子目录约定在需要的那一刻才出现，不占常驻上下文。

本包是 `pi-rules` 的**本地裁剪版**，与原版的行为差异：

- 只收集 `AGENTS.md`，不再扫描 `.cursor/` `.claude/` `.omo/` `.github/` 的规则目录；
- 不加载用户级规则；
- 去掉 `picomatch` 依赖，**零依赖**，以 TS 源码直接运行。

## 安装

```bash
pi install npm:@suwenguang/pi-rules
```

也可以从 Git 安装（国内可换 `git:gitee.com/suveng/pi-rules`）：

```bash
pi install git:github.com/suveng/pi-rules
```

## 用法

装好后不需要额外配置。在 pi 里：

- `/rules` —— 查看当前会话已加载 / 命中了哪些 `AGENTS.md`、各自多少字符；
- `/reload-rules` —— 改完 `AGENTS.md` 后立刻重载，不必重启会话；
- 环境变量 / 启动参数：
  - `PI_RULES_DISABLED=1`（或 `--pi-rules-disabled`）—— 临时关掉整个扩展；
  - `PI_RULES_MODE=static|dynamic|both|off`（或 `--pi-rules-mode`）—— 注入时机，
    `static` 只在一开始注入，`dynamic` 随工具调用按路径注入，`both` 两者都要，`off` 等于关闭；
  - `PI_RULES_MAX_RULE_CHARS` / `PI_RULES_MAX_RESULT_CHARS` —— 单条规则 / 单次结果的字符上限，超出会截断。

## 与上游的关系

行为参考 oh-my-openagent（omo）的 rules-injector，授权与出处见 [NOTICE](./NOTICE)。本仓是独立维护的裁剪分支，与上游没有同步承诺。

## 仓库来源（维护者看）

代码的原始位置是本机 monorepo 里的 `.pi/pi-rules/`，这里是一份镜像仓，用于发布 npm 包。
改完源目录后同步过来：

```bash
bash scripts/sync-from-monorepo.sh /Users/kiki/doger/ev/vkk_client_flutter
```

脚本只同步 `src/`、`LICENSE`、`NOTICE`，**不会覆盖**本仓的 `package.json`、`README.md`、`.github/`。

## 发布（维护者）

npm 包名 `@suwenguang/pi-rules`，由 GitHub Actions 走 OIDC 信任发布，仓库内不放任何 token。

```bash
npm version patch --no-git-tag-version
git commit -am "chore(发布): 0.1.2"
git tag v0.1.2
git push origin main v0.1.2      # 触发 Actions
```

成功征兆：Actions 变绿且日志末尾出现 `+ @suwenguang/pi-rules@<ver>`，并且
`npm view @suwenguang/pi-rules version --registry=https://registry.npmjs.org` 在 1-2 分钟后返回新版本号（期间 404 是正常的风控延迟）。

Trusted Publisher 配置（改包名 / 改工作流文件名时要同步改）：
https://www.npmjs.com/package/@suwenguang/pi-rules/access
—— Publisher `GitHub Actions`、Organization `suveng`、Repository `pi-rules`、Workflow filename `publish.yml`、Environment 留空。
