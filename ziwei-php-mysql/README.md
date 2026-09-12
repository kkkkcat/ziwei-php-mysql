# 紫微斗數排盤系統 — PHP + MySQL 穩定版

以 **PHP 8.3 + Apache + MySQL 8.4 LTS** 為產品後端，瀏覽器端固定使用 **iztro 2.6.1**（MIT）做排盤與運限計算。目標是做成可長期維護的單人 / 小型工作室紫微命例系統，而不是把整套命理公式重新手抄在 PHP 裡。

## 目前已實作

- 公曆 / 農曆排盤、閏月、男女、0–23 時出生時間，含早 / 晚子時映射
- 12 宮完整盤面、14 主星、輔星、雜曜、神煞、廟旺利陷、本命四化
- 命宮 / 身宮、命主 / 身主、五行局、四柱、生肖、星座
- 大限、小限、流年、流月、流日、流時；運限流曜與運限四化疊加
- 三方四正點選、高亮、虛線連接
- 大限 / 流年 / 流月 / 流日 / 流時互動時間軸與任意運限日期
- 命例新增、搜尋、載入、更新、刪除
- MySQL 保存完整命盤快照、引擎版本與當次算法設定，方便日後回溯
- 完整 JSON 資料備份 / 合併匯入 / 覆蓋還原
- 排盤設定：通行 / 中州、年分界、運限分界、小限年齡分界、晚子時分界
- 匯出單一命例 JSON、瀏覽器列印 / PDF
- PWA：Chrome / Edge 可「安裝 App」到 Windows 桌面，不需要另外維護一套 Windows 原生程式
- Docker Desktop 一鍵啟動；也可部署到 XAMPP / 一般 Apache + PHP + MySQL
- GitHub Actions：PHP 語法、JavaScript 語法、MySQL round-trip、固定版 iztro 運限 API smoke test

## 架構

```text
Windows / macOS / Android / iOS
          │
          ▼
Browser / Installed PWA
Vanilla JS + CSS + iztro 2.6.1
          │ same-origin JSON API
          ▼
PHP 8.3 + Apache
PDO prepared statements
          │
          ▼
MySQL 8.4 LTS
cases / app_settings / schema_meta
```

### 為什麼 PHP + MySQL，但排盤引擎不是硬寫 PHP？

PHP + MySQL 很適合命例、會員、備註、搜尋、報表、權限與未來 AI API；但紫微斗數包含大量星曜、亮度、四化、節氣與運限規則，而且存在流派差異。產品風險最大的不是 PHP 效能，而是**排盤算法被重抄後出現安靜的錯盤**。

因此本專案把成熟排盤核心固定在 `iztro 2.6.1`，PHP 負責後端與資料。CI 會對 `bySolar()`、12 宮、`decadalList()`、`yearlyList()`、`monthlyList()`、`horoscope()` 和三方四正 API 做 smoke test。若未來升級排盤引擎，應先通過你的權威命例回歸集，再改版本。

## Windows 最快啟動

### 方案 A：Docker Desktop（建議）

1. 安裝 Docker Desktop。
2. 解壓本專案。
3. 可先複製 `.env.example` 為 `.env` 並修改資料庫密碼。
4. 雙擊：

```text
scripts\start-windows.bat
```

程式會：

1. 嘗試下載固定版 `iztro-v2.6.1.min.js` 到本機；若失敗仍可在線使用固定 CDN。
2. 啟動 PHP + MySQL。
3. 打開 `http://localhost:8080`。

預設只綁定 `127.0.0.1`，不會把 MySQL 或 Web 服務直接暴露到區網。

停止服務：

```text
scripts\stop-windows.bat
```

若要連同本機 MySQL 資料全部刪除，才執行：

```text
scripts\uninstall-local-data.bat
```

該腳本會要求輸入 `DELETE`，避免誤刪。

### 安裝成 Windows App 外觀

用 Edge / Chrome 開啟系統後，若瀏覽器支援安裝，右上會出現 **安裝 App**。安裝後會有獨立視窗與桌面 / 開始功能表入口，但核心仍維持同一套 PHP + MySQL，不用再維護另一個 `.exe` 分支。

## XAMPP / 傳統 Apache + MySQL

1. MySQL 8 建立資料庫並執行 `database/schema.sql`。
2. `public/` 設為網站 DocumentRoot；`src/` 放在其上一層。
3. PHP 建議 8.3；最低需求以你部署前的 CI 驗證版本為準。
4. 啟用 `pdo_mysql`；`mbstring` 建議啟用（程式有 fallback，但 Unicode 截斷以 mbstring 最準確）。
5. 設定 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASS`、`APP_TIMEZONE`。
6. 執行 `scripts/setup-vendor.ps1`，把排盤引擎固定成本機檔案。

## 資料表重點

`cases` 除了出生資料與備註，還會保存：

- `engine_name = iztro`
- `engine_version = 2.6.1`
- `settings_json`：保存當次算法 / 分界設定
- `chart_json`：保存當次本命盤快照

載入命例時仍會用目前選定設定重新排盤，所以「目前結果」與「歷史快照」可分開驗證。

## 備份

命例抽屜內有：

- **備份**：匯出所有命例 + 設定為 JSON
- **匯入**：可選擇覆蓋或合併

Docker 的 MySQL volume 也會永久保留資料，除非執行 `docker compose down -v` 或 `uninstall-local-data.bat`。

## 測試

本機可先做不需要資料庫的語法檢查：

```bash
node --check public/assets/app.js
php -l public/index.php
php -l public/api.php
php -l src/bootstrap.php
```

GitHub Actions 額外會安裝 `iztro@2.6.1` 做排盤 / 運限 smoke test，並啟 MySQL 8.4 驗證 schema 與 CRUD round-trip。

## 正式上網前還必須補的東西

目前定位是 **本機 / 單人工作室版**。如果要公開給會員使用，不應直接把這版裸露在 Internet。下一階段至少要加入：

- 登入 / 密碼雜湊 / Session 管理
- RBAC 或至少 owner_id 隔離命例
- CSRF、rate limit、登入防暴力破解
- HTTPS、反向代理、正式 secrets 管理
- MySQL 自動備份與異地備份
- audit log、刪除復原、隱私政策與資料保留策略

## 命理正確性驗收

「功能很多」不等於「每個門派都會算一樣」。正式使用前，請建立你指定門派的權威命例集，至少涵蓋：

- 早子 / 晚子時
- 閏月 15 日前後
- 立春 / 農曆年分界
- 大限交界日、生日分界
- 有閏月年份的流月
- 男女陰陽順逆差異

詳見 `docs/ACCEPTANCE.md`。

## 第三方

- iztro 2.6.1 — MIT License — `THIRD_PARTY_NOTICES.md`


## 一鍵上傳到 GitHub

Windows 解壓專案後，直接雙擊根目錄的 `PUSH-TO-GITHUB.bat`。腳本會 clone `kkkkcat/ziwei-php-mysql`、同步完整專案、建立 commit，並 push 到 `main`。第一次使用 Git for Windows 時可能會開啟瀏覽器要求登入 GitHub。

> `.env` 不會被上傳；請只保留 `.env.example` 在 repository。
