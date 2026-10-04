// 監聽 Service Worker 安裝事件
self.addEventListener('install', (event) => {
  // 強制讓新的 Service Worker 立即進入激活狀態
  self.skipWaiting();
});

// 監聽 Service Worker 激活事件
self.addEventListener('activate', (event) => {
  // 讓 Service Worker 立即接管所有開啟的網頁分頁
  event.waitUntil(self.clients.claim());
});

// 攔截網路請求，補上安全標頭
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 僅針對 HTML 網頁、同源的請求進行標頭改寫（避免影響第三方 API 或圖片）
  if (request.mode === 'navigate' || request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(request).then((response) => {
        // 如果回應失敗或不是標準回應，直接返回
        if (!response) return response;

        // 複製原始的回應標頭
        const newHeaders = new Headers(response.headers);

        // 🛡️ 注入各式安全標頭
        // 1. 防止點擊綁架 (Clickjacking)
        newHeaders.set('X-Frame-Options', 'DENY');
        
        // 2. 防止瀏覽器惡意猜測 MIME 類型 (XSS 防禦)
        newHeaders.set('X-Content-Type-Options', 'nosniff');
        
        // 3. 啟用瀏覽器內建的 XSS 保護 (舊版瀏覽器適用)
        newHeaders.set('X-XSS-Protection', '1; mode=block');
        
        // 4. 控制 Referrer 資訊的傳遞
        newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // 5. 內容安全政策 (CSP) - 根據你的網站需求調整，以下為嚴格版範例
        newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
        
        // 6. 權限政策 (限制網頁存取相機、麥克風、定位等)
        newHeaders.set('Permission-Policy', 'geolocation=(), camera=(), microphone=()');

        // 建立一個全新的回應物件，包含原本的內容與新加入的安全標頭
        const modifiedResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });

        return modifiedResponse;
      }).catch((error) => {
        // 網路斷線等異常處理
        return console.error('Fetch 錯誤:', error);
      })
    );
  }
});
