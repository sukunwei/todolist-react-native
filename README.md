# TODOLIST

一个纯本地的待办清单 App，为 App Store 上架实验而做。

**不联网、不注册、不采集任何用户数据** —— 所有任务只存在设备本地（AsyncStorage）。

技术栈：React Native 0.88.1（裸工程） · TypeScript · React Navigation 7 · Zustand · AsyncStorage

完整设计与实施计划见 [开发计划.md](./开发计划.md)。

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. iOS 原生依赖（务必走 bundler，不要用系统 pod）
bundle install
cd ios && bundle exec pod install && cd ..

# 3. 启动 Metro
npm start

# 4. 编译并运行到模拟器
npm run ios
```

> **端口占用**：8081 可能被其他项目占用，可用 `npm start -- --port 8082` 与
> `npx react-native run-ios --port 8082` 换端口。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm start` | 启动 Metro |
| `npm run ios` | 编译并运行到 iOS 模拟器 |
| `npm run lint` | ESLint 检查 |
| `npm test` | Jest 单元测试 |
| `npm run typecheck` | TypeScript 类型检查（`tsc --noEmit`） |
| `python3 scripts/generate-icon.py` | 重新生成占位 App 图标 |

提交前请确保 `npm run lint && npm test && npm run typecheck` 三项全绿。

---

## 目录结构

```
src/
├── components/     TaskItem / TaskFilterBar / PriorityBadge / EmptyState
├── navigation/     RootNavigator（单页 + 弹窗）与路由类型
├── screens/        TaskListScreen（主列表）/ TaskEditorModal（新增编辑）
├── store/          Zustand store（useTaskStore）与 AsyncStorage 封装
├── theme/          颜色 / 间距 / 字号 token，支持深色模式
├── types/          Task / Priority / TaskFilter 领域模型
└── utils/          id 生成、相对时间格式化、排序规则、触感封装
```

### 数据流

```
用户操作 → Zustand action → state 更新 → persist 中间件自动写 AsyncStorage
                                        → 组件订阅重渲染
```

组件只 `select` 稳定引用（`tasks` 数组本身、`filter` 等原始值），派生列表用
`useMemo` 计算。**不要把 `useMemo` 的结果直接作为 zustand selector 返回** ——
zustand v5 基于 `useSyncExternalStore`，每次 `getSnapshot` 返回新数组引用会
导致无限重渲染。

### 排序规则

排序逻辑统一在 `src/utils/sort.ts`，组件不要另写：

1. 未完成在前，已完成沉底
2. 组内按 `order` 升序
3. `order` 相同时按优先级（高 → 中 → 低）
4. 仍相同时按创建时间倒序

---

## 上架前必做

- [ ] 把 `com.example.todolist` 换成自己的 Bundle ID（`project.pbxproj` / `Info.plist` / App Store Connect 三处一致）
- [ ] 在 Xcode → Signing & Capabilities 选择付费开发者 Team
- [ ] 替换正式 App 图标（`scripts/generate-icon.py` 只是占位）
- [ ] 部署隐私政策页面（**必填**，即使不收集数据也要有）
- [ ] App Store Connect 隐私标签选「不收集数据」
- [ ] 补齐 §7.1 的差异化功能清单（筛选 / 优先级 / 排序 / 完成率 / 深色模式 / 无障碍）

详见 [开发计划.md](./开发计划.md) 的 §9。
