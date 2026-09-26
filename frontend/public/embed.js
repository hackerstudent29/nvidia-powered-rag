/**
 * Lorin AI — Universal Embeddable Chatbot Widget
 * ===============================================
 * Embeds Lorin AI into any website with a floating action button,
 * responsive modal popup, and fullscreen redirection.
 *
 * Usage:
 * <script src="https://<YOUR_CHATBOT_DOMAIN>/embed.js" defer></script>
 */

(function () {
  if (window.__LORIN_AI_EMBEDDED__) return;
  window.__LORIN_AI_EMBEDDED__ = true;

  // Determine current script location to resolve bot base URL
  const currentScript =
    document.currentScript ||
    document.querySelector('script[src*="embed.js"]') ||
    document.querySelector('script[data-bot-url]');

  const scriptSrc = currentScript ? currentScript.getAttribute("src") || "" : "";
  let defaultBaseUrl = "https://lorin-ai.vercel.app";

  try {
    if (scriptSrc.startsWith("http")) {
      const url = new URL(scriptSrc);
      defaultBaseUrl = url.origin;
    } else if (typeof window !== "undefined" && window.location) {
      defaultBaseUrl = window.location.origin;
    }
  } catch (e) {
    // fallback to default
  }

  const BOT_URL = (
    (currentScript && currentScript.getAttribute("data-bot-url")) ||
    (window.LorinChatConfig && window.LorinChatConfig.botUrl) ||
    defaultBaseUrl
  ).replace(/\/$/, "");

  const BRAND_COLOR = "#9E2339"; // MSAJCE Academic Maroon Red
  const AVATAR_URL = `${BOT_URL}/lorin-pic.png`;

  // Inject CSS Styles
  const style = document.createElement("style");
  style.id = "lorin-ai-widget-styles";
  style.innerHTML = `
    .lorin-widget-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: ${BRAND_COLOR};
      background: linear-gradient(135deg, #9E2339 0%, #781A2B 100%);
      color: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(158, 35, 57, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 2px solid rgba(255, 255, 255, 0.25);
      user-select: none;
      outline: none;
    }
    .lorin-widget-fab:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 15px 30px -5px rgba(158, 35, 57, 0.55), 0 10px 12px -5px rgba(0, 0, 0, 0.15);
    }
    .lorin-widget-fab:active {
      transform: scale(0.95);
    }
    .lorin-widget-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      pointer-events: none;
    }
    .lorin-widget-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10B981;
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
    }
    .lorin-widget-badge-pulse {
      position: absolute;
      top: -2.5px;
      left: -2.5px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10B981;
      opacity: 0.75;
      animation: lorin-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes lorin-ping {
      75%, 100% {
        transform: scale(2);
        opacity: 0;
      }
    }
    .lorin-widget-pill {
      position: absolute;
      right: 74px;
      background: #ffffff;
      color: #1a1a1a;
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      white-space: nowrap;
      pointer-events: none;
      opacity: 1;
      transform: translateX(0);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .lorin-widget-pill.hidden {
      opacity: 0;
      transform: translateX(10px);
    }
    .lorin-widget-window {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 420px;
      max-width: calc(100vw - 32px);
      height: 660px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.08);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: scale(0.92) translateY(20px);
      transform-origin: bottom right;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .lorin-widget-window.open {
      opacity: 1;
      pointer-events: auto;
      transform: scale(1) translateY(0);
    }
    .lorin-widget-header {
      background: ${BRAND_COLOR};
      background: linear-gradient(135deg, #9E2339 0%, #82172B 100%);
      color: #ffffff;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    .lorin-widget-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .lorin-widget-header-text h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.2px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.2;
    }
    .lorin-widget-header-text p {
      margin: 2px 0 0 0;
      font-size: 11px;
      opacity: 0.85;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .lorin-widget-header-text p span.dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      display: inline-block;
    }
    .lorin-widget-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .lorin-widget-btn {
      background: rgba(255, 255, 255, 0.12);
      border: none;
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .lorin-widget-btn:hover {
      background: rgba(255, 255, 255, 0.22);
    }
    .lorin-widget-iframe-container {
      flex: 1;
      position: relative;
      background: #f8f9fa;
      width: 100%;
      height: 100%;
    }
    .lorin-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    .lorin-widget-loader {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      gap: 12px;
      transition: opacity 0.3s;
      z-index: 1;
    }
    .lorin-widget-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(158, 35, 57, 0.15);
      border-top-color: ${BRAND_COLOR};
      border-radius: 50%;
      animation: lorin-spin 0.8s linear infinite;
    }
    @keyframes lorin-spin {
      to { transform: rotate(360deg); }
    }
    @media (max-width: 640px) {
      .lorin-widget-window {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        max-width: 100vw;
        max-height: 100vh;
        max-height: 100dvh;
        border-radius: 0;
      }
      .lorin-widget-fab {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create Widget DOM Elements
  const container = document.createElement("div");
  container.id = "lorin-ai-widget-root";

  // Launcher FAB
  const fab = document.createElement("button");
  fab.className = "lorin-widget-fab";
  fab.setAttribute("aria-label", "Open Lorin AI Chatbot");
  fab.innerHTML = `
    <img src="${AVATAR_URL}" class="lorin-widget-avatar" alt="Lorin AI" onerror="this.src='https://cdn-icons-png.flaticon.com/512/4712/4712038.png'" />
    <div class="lorin-widget-badge">
      <div class="lorin-widget-badge-pulse"></div>
    </div>
    <div class="lorin-widget-pill" id="lorin-widget-tooltip">
      <span>Ask Lorin AI</span> 👋
    </div>
  `;

  // Chat Window Modal
  const windowEl = document.createElement("div");
  windowEl.className = "lorin-widget-window";
  windowEl.innerHTML = `
    <div class="lorin-widget-header">
      <div class="lorin-widget-header-title">
        <img src="${AVATAR_URL}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="MSAJCE" onerror="this.style.display='none'" />
        <div class="lorin-widget-header-text">
          <h3>Lorin AI</h3>
          <p><span class="dot"></span> MSAJCEA Official Intelligence</p>
        </div>
      </div>
      <div class="lorin-widget-actions">
        <button class="lorin-widget-btn" id="lorin-fullscreen-btn" title="View in Fullscreen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </button>
        <button class="lorin-widget-btn" id="lorin-close-btn" title="Close Chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="lorin-widget-iframe-container">
      <div class="lorin-widget-loader" id="lorin-loader">
        <div class="lorin-widget-spinner"></div>
        <span style="font-size: 12px; color: #666; font-family: -apple-system, sans-serif; font-weight: 500;">Connecting to Lorin AI...</span>
      </div>
      <iframe
        id="lorin-chat-iframe"
        class="lorin-widget-iframe"
        src=""
        allow="clipboard-write; microphone"
        title="Lorin AI Chatbot"
      ></iframe>
    </div>
  `;

  container.appendChild(fab);
  container.appendChild(windowEl);
  document.body.appendChild(container);

  let isOpen = false;
  const iframe = windowEl.querySelector("#lorin-chat-iframe");
  const loader = windowEl.querySelector("#lorin-loader");
  const tooltip = fab.querySelector("#lorin-widget-tooltip");
  const fullscreenBtn = windowEl.querySelector("#lorin-fullscreen-btn");
  const closeBtn = windowEl.querySelector("#lorin-close-btn");

  // Auto-hide tooltip after 6 seconds
  setTimeout(() => {
    if (tooltip) tooltip.classList.add("hidden");
  }, 6000);

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      if (!iframe.src) {
        // Lazy load iframe on first click for zero initial page overhead
        iframe.src = `${BOT_URL}/?embed=true`;
        iframe.onload = () => {
          if (loader) loader.style.opacity = "0";
          setTimeout(() => {
            if (loader) loader.style.display = "none";
          }, 300);
        };
      }
      windowEl.classList.add("open");
      if (tooltip) tooltip.classList.add("hidden");
    } else {
      windowEl.classList.remove("open");
    }
  }

  fab.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", toggleChat);

  // Fullscreen Redirect Button
  fullscreenBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.open(BOT_URL, "_blank");
  });

  // Close on Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggleChat();
    }
  });
})();
