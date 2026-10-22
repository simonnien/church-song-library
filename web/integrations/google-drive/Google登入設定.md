# Google 登入設定

正式網站：https://songs.beersheba.cc

管理者：simon930926@gmail.com。其他編輯者由管理者登入後在「管理 → Google 編輯者」新增信箱。訪客仍可公開閱讀及匯出。Google 登入只要求 openid、email，不會取得 Google Drive 權限。

## Google Cloud 一次性設定

1. 使用管理者 Google 帳號開啟 https://console.cloud.google.com/ ，選擇或建立專案。
2. 進入 Google Auth Platform，完成 Branding：應用程式名稱「別是巴詩歌書房」、支援信箱及開發人員信箱使用自己的信箱；網站首頁填 https://songs.beersheba.cc ，授權網域填 beersheba.cc。
3. Audience 選 External。測試期間加入管理者及要測試的編輯者信箱；正式開放同工前切換 Production，並按 Google 頁面的要求完成設定。
4. Clients → Create client → Web application。
5. Authorized JavaScript origins 填 https://songs.beersheba.cc （無結尾斜線）。
6. Authorized redirect URIs 必須完整填入 https://songs.beersheba.cc/api/auth/google/callback 。
7. 由帳戶持有人建立並下載用戶端 JSON，放在自己的私人目錄，不要上傳 GitHub，也不要把密鑰貼到聊天。
8. 將 web client_id、client_secret 分別設定為 Asher 帳戶 beersheba-songs Worker 的 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET secrets，再重新部署。

兩個設定存在時才啟用 Google 登入，舊帳密登入將停止接受請求，舊帳密工作階段也不再具有編輯權限。未完成設定前仍保留現有登入方式，避免管理者被鎖在外面。

## 切換驗證

- 在 Chrome、Edge 或手機系統瀏覽器開啟正式網站；Google 可能拒絕內嵌瀏覽器登入。
- 使用管理者登入，確認可以管理編輯者與修改歌曲編號。
- 未列入編輯者清單的 Google 帳號不得取得編輯權限。
- 新增編輯者後，以該帳號登入確認可以編輯、不能管理其他帳號。
- 停用編輯者後，既有登入工作階段應立即失效。
- 取消授權／過期登入流程應回到網站並顯示錯誤，不可取得權限。

背景影片上傳至 Google Drive 與每週使用統計是另一項待完成工作；本設定不會啟用影片上傳，也不會切換歌曲資料庫到 Drive。
