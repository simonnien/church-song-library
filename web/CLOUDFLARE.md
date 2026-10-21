# 自己管理 Cloudflare 網站

此目錄是 Cloudflare 部署版。原本 Sites 網站仍保留，不會因修改此目錄而更新。

## 第一次設定

1. 安裝 Node.js 22.13 以上與專案指定版本 pnpm，在本目錄執行 `pnpm install --frozen-lockfile`。
2. 執行 `pnpm cf:login`，在瀏覽器確認 Cloudflare 帳號與授權。
3. 執行 `pnpm exec wrangler d1 create beersheba-songs --location apac`。
4. 將回傳的 `database_id` 填入 `wrangler.jsonc`，保留 binding 為 `DB`。
5. 執行 `pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.jsonc` 建立資料表。
6. 先備份原站歌曲及帳號狀態，再匯入新 D1。歌曲備份與密碼雜湊不可放進 GitHub；存放於被忽略的 `.sites-runtime/cloudflare/`。
7. 執行 `pnpm cf:build`，再執行 `pnpm cf:deploy`。Wrangler 會顯示新站網址。
8. 驗證歌曲數量、管理者登入、修改密碼、儲存與匯出後，再分享新站網址。舊站不會自動同步新 D1。

歌曲 JSON 備份可轉換成匯入 SQL：

```powershell
node scripts/prepare-song-import.mjs ".sites-runtime/cloudflare/songs.json"
pnpm exec wrangler d1 execute DB --remote --config wrangler.jsonc --file .sites-runtime/cloudflare/songs.sql
```

此步驟只匯入歌曲；帳號雜湊、停用狀態、強制修改密碼狀態與修改紀錄需另行遷移。不要複製舊登入工作階段。沒有初始化帳號前，新站無法登入。

若原站啟用 Drive 同步，須另行設定 `DRIVE_BRIDGE_URL` 與 `DRIVE_BRIDGE_TOKEN`。這兩項是 Worker secrets，不能放進公開儲存庫。本次預設使用新 D1，沒有設定 Drive secrets 時不會修改原 Drive。

## GitHub 自動部署

Cloudflare Dashboard → Workers & Pages → 選擇 `beersheba-songs` → Settings → Builds，連接此 GitHub 儲存庫。

| 設定 | 值 |
|---|---|
| Production branch | `main` |
| Root directory | `web` |
| Build command | `pnpm cf:build` |
| Deploy command | `pnpm cf:deploy` |

填妥 D1 ID 後才啟用自動部署；部署所用權限須包含該 Worker 與 D1 migration。自動部署只更新程式及資料表結構，不會清除已編輯歌曲。

日後在此目錄修改程式，推送 GitHub 即可自動更新。保留另一份 Sites 程式當備份即可，避免在兩個目錄同時修改。

## 本機預覽

`pnpm cf:dev`。本機 D1 與正式 D1 分開；若尚無資料表，先將上方 migration 指令的 `--remote` 改為 `--local`。正式部署可使用免費 `workers.dev` 網址，之後再加自己的網域。
