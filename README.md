# TODOLIST

一個純本機的待辦清單 App，為 App Store 上架實驗而做。

**不連線、不註冊、不蒐集任何使用者資料** —— 所有任務只存在裝置本機（AsyncStorage）。

技術棧：React Native 0.88.1（裸工程） · TypeScript · React Navigation 7 · Zustand · AsyncStorage

完整設計與實施計劃見 [開發計劃.md](./開發計劃.md)。

---

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. iOS 原生依賴（務必走 bundler，不要用系統 pod）
bundle install
cd ios && bundle exec pod install && cd ..

# 3. 啟動 Metro
npm start

# 4. 編譯並運行到模擬器
npm run ios
```

> **端口占用**：8081 可能被其他項目佔用，可用 `npm start -- --port 8082` 與
> `npx react-native run-ios --port 8082` 換端口。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm start` | 啟動 Metro |
| `npm run ios` | 編譯並運行到 iOS 模擬器 |
| `npm run lint` | ESLint 檢查 |
| `npm test` | Jest 單元測試 |
| `npm run typecheck` | TypeScript 類型檢查（`tsc --noEmit`） |

提交前請確保 `npm run lint && npm test && npm run typecheck` 三項全綠。

## 輔助腳本

| 腳本 | 作用 |
|---|---|
| `scripts/run-sim.sh` | 啟動模擬器、裝 App、打開原生模擬器窗口（Device Hub）、截圖 |
| `scripts/generate-icon.py` | 生成 1024×1024 無 Alpha 的 App 圖示（`--preview` 額外出各尺寸對照） |
| `scripts/seed-tasks.py` | 往模擬器灌示例任務（`--count N` 可灌任意條數） |
| `scripts/capture-screenshots.sh` | 批量截取 5 張 App Store 截圖（iPhone 18 Pro Max，1320×2868） |
| `scripts/sim-viewer.js` | headless 環境下的網頁投屏 + 點選轉發（備用） |

## 上架材料

| 文件 | 內容 |
|---|---|
| [`App Store 元資料.md`](./App%20Store%20元資料.md) | 名稱、副標題、描述、關鍵詞、截圖說明、審核備註、提交檢查清單 |
| [`隱私政策.md`](./隱私政策.md) | 隱私政策正文（需部署成公開網頁後填進 App Store Connect） |
| `screenshots/` | 5 張 1320×2868 上架截圖 |
| `ios/.../AppIcon.png` | 1024×1024 無 Alpha 圖示 |

---

## 目錄結構

```
src/
├── components/     TaskItem / TaskFilterBar / PriorityBadge / EmptyState
├── navigation/     RootNavigator（單頁 + 彈出視窗）與路由類型
├── screens/        TaskListScreen（主列表）/ TaskEditorModal（新增編輯）
├── store/          Zustand store（useTaskStore）與 AsyncStorage 封裝
├── theme/          顏色 / 間距 / 字號 token，支援深色模式
├── types/          Task / Priority / TaskFilter 領域模型
└── utils/          id 生成、相對時間格式化、排序規則、觸感封裝
```

### 資料流

```
使用者操作 → Zustand action → state 更新 → persist 中間件自動寫 AsyncStorage
                                        → 元件訂閱重渲染
```

元件只 `select` 穩定引用（`tasks` 數組本身、`filter` 等原始值），派生列表用
`useMemo` 計算。**不要把 `useMemo` 的結果直接作為 zustand selector 返回** ——
zustand v5 基於 `useSyncExternalStore`，每次 `getSnapshot` 返回新數組引用會
導致無限重渲染。

### 排序規則

排序邏輯統一在 `src/utils/sort.ts`，元件不要另寫：

1. 未完成在前，已完成沉底
2. 組內按 `order` 升序
3. `order` 相同時按優先級（高 → 中 → 低）
4. 仍相同時按創建時間倒序

---

## 上架前必做

- [ ] 把 `com.kunweisu.qingdanben` 換成自己的 Bundle ID（`project.pbxproj` / `Info.plist` / App Store Connect 三處一致）
- [ ] 在 Xcode → Signing & Capabilities 選擇付費開發者 Team
- [ ] 替換正式 App 圖示（`scripts/generate-icon.py` 只是佔位）
- [ ] 部署隱私政策頁面（**必填**，即使不收集資料也要有）
- [ ] App Store Connect 隱私標籤選「不收集資料」
- [ ] 補齊 §7.1 的差異化功能清單（篩選 / 優先級 / 排序 / 完成率 / 深色模式 / 無障礙）

詳見 [開發計劃.md](./開發計劃.md) 的 §9。
