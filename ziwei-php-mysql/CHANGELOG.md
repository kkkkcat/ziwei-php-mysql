# Changelog

## 1.1.0

- 固定 PHP 8.3 + MySQL 8.4 LTS + iztro 2.6.1 架構。
- 完整 12 宮本命盤與大限 / 小限 / 流年 / 流月 / 流日 / 流時呈現。
- 命例 CRUD、搜尋、備註、命盤 JSON 快照。
- 保存排盤引擎版本與算法設定，提升可追溯性。
- 新增完整資料備份、合併匯入與覆蓋還原。
- 新增 PWA 安裝與 service worker。
- Docker 預設只綁 localhost，加入 PHP OPcache 與安全標頭。
- 新增 GitHub Actions：PHP / JS syntax、iztro engine smoke、MySQL smoke。
- Windows 一鍵啟動腳本自動嘗試取得固定版本排盤引擎。
