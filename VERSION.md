# Git 版本管理说明

## 当前版本

**版本**: v1.0.0
**提交**: fb6a8cb (添加 .gitignore 文件)
**日期**: 2026-01-27
**状态**: ✅ 稳定版本

## 版本历史

### v1.0.0 (2026-01-27)
- ✅ 完成所有核心页面开发
- ✅ 集成 TDesign 组件库
- ✅ 实现底部导航栏
- ✅ 添加真实图标资源
- ✅ 完善项目文档

**包含功能**:
- 首页：工作状态展示、时薪计算、模式切换
- 攒钱观察：愿望管理、进度追踪
- 愿望详情：统计分析、资金来源
- 我的页面：数据统计、参数设置
- 引导设置：初始化配置流程

**提交记录**:
```
fb6a8cb - 添加 .gitignore 文件
8b02f93 - 完成小程序前端页面开发
202db15 - 初始化项目_安装td
```

## 常用 Git 命令

### 查看状态
```bash
git status                    # 查看当前状态
git log --oneline -10         # 查看最近 10 条提交记录
git log --graph --oneline     # 图形化查看提交历史
```

### 回滚操作

#### 1. 回滚到指定版本（保留修改）
```bash
git reset --soft 8b02f93      # 回滚到指定提交，保留所有更改
```

#### 2. 回滚到指定版本（丢弃修改）
```bash
git reset --hard 8b02f93      # 回滚到指定提交，丢弃所有更改
```

#### 3. 撤销最近一次提交
```bash
git reset --soft HEAD~1       # 撤销最后一次提交，保留更改
git reset --hard HEAD~1       # 撤销最后一次提交，丢弃更改
```

#### 4. 查看某个版本的文件
```bash
git show 8b02f93:miniprogram/app.json     # 查看指定版本的文件
```

#### 5. 恢复单个文件到指定版本
```bash
git checkout 8b02f93 -- miniprogram/pages/home/home.js
```

### 创建标签
```bash
git tag -a v1.0.0 -m "首个稳定版本"    # 创建标签
git tag                                 # 查看所有标签
git show v1.0.0                         # 查看标签详情
```

### 分支管理
```bash
git branch                              # 查看所有分支
git branch feature/new-feature          # 创建新分支
git checkout feature/new-feature        # 切换分支
git checkout -b feature/new-feature     # 创建并切换分支
git merge feature/new-feature           # 合并分支
git branch -d feature/new-feature       # 删除分支
```

### 对比差异
```bash
git diff                                # 查看未暂存的更改
git diff --staged                       # 查看已暂存的更改
git diff 8b02f93 fb6a8cb                # 对比两个版本的差异
git diff HEAD~2 HEAD                    # 对比最近两次提交
```

### 暂存工作区
```bash
git stash                               # 暂存当前工作区
git stash list                          # 查看暂存列表
git stash apply                         # 恢复最近的暂存
git stash pop                           # 恢复并删除最近的暂存
git stash drop                          # 删除最近的暂存
```

## 推荐工作流程

### 开发新功能
```bash
# 1. 创建功能分支
git checkout -b feature/add-statistics

# 2. 开发功能并提交
git add .
git commit -m "添加统计功能"

# 3. 切换回主分支
git checkout master

# 4. 合并功能分支
git merge feature/add-statistics

# 5. 删除功能分支
git branch -d feature/add-statistics
```

### 修复 Bug
```bash
# 1. 创建修复分支
git checkout -b hotfix/fix-timer-issue

# 2. 修复并提交
git add .
git commit -m "修复：定时器内存泄漏问题"

# 3. 合并到主分支
git checkout master
git merge hotfix/fix-timer-issue

# 4. 删除修复分支
git branch -d hotfix/fix-timer-issue
```

### 测试版本
```bash
# 1. 创建测试分支
git checkout -b test/v1.1.0

# 2. 在测试分支上进行测试修改
git add .
git commit -m "测试：新功能集成测试"

# 3. 测试通过后合并到主分支
git checkout master
git merge test/v1.1.0

# 4. 创建版本标签
git tag -a v1.1.0 -m "版本 1.1.0"
```

## 重要提示

1. **提交前检查**: 始终运行 `git status` 和 `git diff` 检查更改
2. **提交信息规范**: 使用清晰的提交信息，说明"做了什么"和"为什么"
3. **小步提交**: 每完成一个功能点就提交，不要积累太多更改
4. **定期备份**: 可以将代码推送到远程仓库（GitHub/GitLab/Gitee）
5. **谨慎使用 --hard**: `git reset --hard` 会永久删除更改，使用前确认

## 下一步建议

1. **推送到远程仓库**（可选）:
```bash
# 添加远程仓库
git remote add origin https://github.com/yourusername/hourly-wage-tracker.git

# 推送代码
git push -u origin master

# 推送标签
git push --tags
```

2. **设置远程备份**: 建议将代码推送到 GitHub/GitLab 等平台，防止本地数据丢失

3. **使用分支开发**: 开发新功能时使用分支，避免影响主分支的稳定性

## 紧急恢复

如果不小心删除了重要文件或提交：

```bash
# 查看所有操作历史（包括被删除的提交）
git reflog

# 恢复到某个历史状态
git reset --hard HEAD@{2}
```

## 联系支持

如有疑问，可以：
- 查看 Git 官方文档：https://git-scm.com/doc
- 使用 `git help <command>` 查看命令帮助
