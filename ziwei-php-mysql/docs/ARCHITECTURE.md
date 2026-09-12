# Architecture Decision Record

## 決策

採用 PHP 8.3 + Apache + MySQL 8.4 LTS 作產品後端；紫微計算固定 iztro 2.6.1 在瀏覽器端執行；Windows 使用 PWA，不另寫獨立原生程式。

## 理由

1. 命例、搜尋、備註、會員、報告、AI 呼叫都屬標準 Web 後端工作，PHP / MySQL 成熟且便宜。
2. 排盤核心屬高規則密度 domain logic，自行重抄會增加錯盤風險；固定成熟開源引擎並以回歸測試鎖住版本更合理。
3. PWA 讓 Windows 有桌面 App 體驗，又保留一套 codebase。
4. 未來真的需要本地檔案、系統 tray 或完全離線，再把現有 Web UI 包 Tauri；後端 API 不需要重寫。

## 邊界

- PHP 是 source of truth：命例、設定、備份、未來帳號與權限。
- MySQL 是 durable storage。
- iztro 是計算 source of truth；版本不可無測試直接升級。
- `chart_json` 是歷史快照，不取代可重算的出生原始資料。

## 下一階段

公開 SaaS 前：users / sessions / owner_id / RBAC / CSRF / rate limiting / audit logs / backup scheduler / HTTPS。
