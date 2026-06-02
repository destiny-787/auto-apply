(() => {
    "use strict";
    /* -------------------------------------------------------
     * 1. 保存原生 Function.prototype.toString
     * ----------------------------------------------------- */
    const nativeFunctionToString = Function.prototype.toString;

    /* -------------------------------------------------------
     * 2. WeakMap：函数 → 伪原生源码
     * ----------------------------------------------------- */
    const nativeSourceMap = new WeakMap();

    /* -------------------------------------------------------
     * 3. 注册伪原生源码
     * ----------------------------------------------------- */
    const registerNativeSource = (fn, source) => {
      try {
        nativeSourceMap.set(fn, source);
      } catch (_) {}
    };

    /* -------------------------------------------------------
     * 4. 劫持 Function.prototype.toString
     * ----------------------------------------------------- */
    Object.defineProperty(Function.prototype, "toString", {
      configurable: true,
      writable: true,
      value: function toString() {
        if (nativeSourceMap.has(this)) {
          return nativeSourceMap.get(this);
        }
        return nativeFunctionToString.call(this);
      },
    });

    /* -------------------------------------------------------
     * 5. 伪装 Function.prototype.toString 自身
     * ----------------------------------------------------- */
    registerNativeSource(
      Function.prototype.toString,
      nativeFunctionToString.toString(),
    );

    /* -------------------------------------------------------
     * 6. stealthify：包装函数但保持"原生外观"
     * ----------------------------------------------------- */
    const stealthify = (obj, prop, handler) => {
      const original = obj[prop];
      if (typeof original !== "function") return;

      const wrapped = function (...args) {
        return handler.call(this, original, args);
      };
      const namePropertyDescriptor = Object.getOwnPropertyDescriptor(
        wrapped,
        "name",
      );
      // 处理函数 name 属性
      Object.defineProperty(wrapped, "name", {
        ...namePropertyDescriptor,
        value: prop,
      });
      // 保留 prototype（某些函数有）
      try {
        Object.setPrototypeOf(wrapped, Object.getPrototypeOf(original));
      } catch (_) {}

      // 注册伪原生源码（直接复用原函数的 native 表现）
      registerNativeSource(wrapped, nativeFunctionToString.call(original));

      // 用 defineProperty 保持 descriptor 接近原生
      const desc = Object.getOwnPropertyDescriptor(obj, prop);
      Object.defineProperty(obj, prop, {
        ...desc,
        value: wrapped,
      });
    };

    /* -------------------------------------------------------
     * 7. 示例：stealth console.log / debug / info
     * ----------------------------------------------------- */
    const filterConsoleArgs = (args) =>
      args.map((arg) => {
        if (arg && typeof arg === "object") {
          // 防止 getter / Proxy / 大对象触发
          return {};
        }
        return arg;
      });

    ["log", "debug", "info", "warn", "error", "dir", "table"].forEach(
      (name) => {
        stealthify(console, name, (original, args) => {
          // ❗不传递原始对象，避免 DevTools / CDP 展开
          return original.apply(console, filterConsoleArgs(args));
        });
      },
    );

    /* -------------------------------------------------------
     * 8. 防御性补丁（可选但强烈建议）
     * ----------------------------------------------------- */

    // 防止检测 toString 被替换
    registerNativeSource(
      registerNativeSource,
      "function registerNativeSource() { [native code] }",
    );

    /* =======================================================
     * 9. 综合浏览器指纹伪装（增强版 — 针对 Boss 直聘反爬）
     * ======================================================= */

    // 9.0 删除 CDP Runtime 注入的属性（必须在最前面执行）
    try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array; } catch (_) {}
    try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON; } catch (_) {}
    try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object; } catch (_) {}
    try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise; } catch (_) {}
    try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy; } catch (_) {}
    try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol; } catch (_) {}
    try { delete window.cdc_adoQpoasnfa76pfcZLmcfl_Window; } catch (_) {}
    // 也尝试删除其他变种的 CDP 注入属性
    Object.getOwnPropertyNames(window).forEach(function(prop) {
      if (prop.startsWith('cdc_') || prop.startsWith('__playwright') || prop.startsWith('__pw_')) {
        try { delete window[prop]; } catch (_) {}
      }
    });

    // 9.1 隐藏 webdriver 标记（多重保障）
    Object.defineProperty(navigator, 'webdriver', {get: () => false, configurable: true});

    // 9.2 模拟 chrome.runtime（正常 Chrome 浏览器有 chrome 对象）
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };

    // 9.3 模拟 navigator.plugins（正常浏览器有插件列表 - 5个插件更真实）
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 2 },
        ];
        plugins.item = function(i) { return this[i]; };
        plugins.namedItem = function(name) { return null; };
        plugins.refresh = function() {};
        return plugins;
      }
    });
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const mimes = {
          0: { type: 'application/pdf', suffixes: 'pdf', description: '', enabledPlugin: { name: 'Chrome PDF Plugin' } },
          1: { type: 'text/pdf', suffixes: 'pdf', description: '', enabledPlugin: { name: 'Chrome PDF Plugin' } },
          length: 2
        };
        mimes.item = function(i) { return this[i]; };
        mimes.namedItem = function(name) { return null; };
        return mimes;
      }
    });

    // 9.4 模拟 navigator.languages / language（中文用户）
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en-US', 'en']
    });
    Object.defineProperty(navigator, 'language', {
      get: () => 'zh-CN'
    });

    // 9.5 模拟 navigator.permissions（避免暴露自动化特征）
    const origPermissions = navigator.permissions;
    if (origPermissions) {
      const origQuery = origPermissions.query.bind(origPermissions);
      navigator.permissions.query = function(desc) {
        if (desc && (desc.name === 'notifications' || desc.name === 'clipboard-read' || desc.name === 'clipboard-write')) {
          return Promise.resolve({ state: 'prompt', onchange: null });
        }
        return origQuery(desc).catch(() => Promise.resolve({ state: 'prompt', onchange: null }));
      };
    }

    // 9.6 模拟 navigator.hardwareConcurrency（常见为 8 或 16 核）
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8
    });

    // 9.7 模拟 navigator.deviceMemory（常见 8 GB）
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8
    });

    // 9.8 模拟 navigator.platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32'
    });

    // 9.9 模拟 navigator.maxTouchPoints
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0
    });

    // 9.10 模拟 navigator.connection（网络信息）
    try {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false,
          onchange: null
        })
      });
    } catch (_) {}

    // 9.11 模拟 screen 属性
    try {
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
    } catch (_) {}

    // 9.12 WebGL 指纹伪装 — 伪装成 Intel 显卡（常见配置）
    try {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Google Inc. (Intel)';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)';
        }
        return getParameter.call(this, parameter);
      };
      // 同时覆盖 WebGL2
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return 'Google Inc. (Intel)';
          }
          if (parameter === 37446) {
            return 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)';
          }
          return getParameter2.call(this, parameter);
        };
      }
    } catch (_) {}

    // 9.13 Canvas 指纹混淆 — 添加微小噪点
    try {
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        try {
          const ctx = this.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, 1, 1);
            if (imageData && imageData.data) {
              // 添加微小干扰
              imageData.data[0] = imageData.data[0] ^ 1;
              ctx.putImageData(imageData, 0, 0);
            }
          }
        } catch (_) {}
        return origToDataURL.apply(this, arguments);
      };
    } catch (_) {}

    // 9.14 隐藏 Playwright/自动化相关属性
    try { delete window.__playwright; } catch (_) {}
    try { delete window.__pw_manual; } catch (_) {}
    try { delete window.__PW_inspect; } catch (_) {}
    try { delete window.__nightmare; } catch (_) {}
    try { delete window.__selenium_unwrapped; } catch (_) {}
    try { delete window.__webdriver_evaluate; } catch (_) {}
    try { delete window.__webdriver_script_function; } catch (_) {}
    try { delete window.__webdriver_script_func; } catch (_) {}
    try { delete window.__webdriver_script_fn; } catch (_) {}
    try { delete window.__fxdriver_evaluate; } catch (_) {}
    try { delete window.__driver_unwrapped; } catch (_) {}
    try { delete window.__webdriver_unwrapped; } catch (_) {}
    try { delete window.__phantom; } catch (_) {}
    try { delete window.callPhantom; } catch (_) {}
    try { delete window._phantom; } catch (_) {}

    // 9.15 覆盖 navigator.userAgent 相关（防止运行时检测修改痕迹）
    try {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        configurable: true
      });
    } catch (_) {}

    // 9.16 覆盖 appVersion
    try {
      Object.defineProperty(navigator, 'appVersion', {
        get: () => '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        configurable: true
      });
    } catch (_) {}
  })();