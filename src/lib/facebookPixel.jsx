// src/facebookPixel.jsx

// src/facebookPixel.jsx
export const initFacebookPixel = () => {
  const pixelId =
    import.meta.env.VITE_FACEBOOK_PIXEL_ID ||
    process.env.REACT_APP_FACEBOOK_PIXEL_ID;

  if (!pixelId) {
    console.warn("[Meta Pixel] Pixel ID missing!");
    return;
  }

  if (!window.fbq) {
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod(...arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  console.log("[Meta Pixel] Initialized with Pixel ID:", pixelId);
};


export const trackPageView = () => {
  if (window.fbq) {
    window.fbq("track", "PageView");
    console.log("[Meta Pixel] PageView tracked:", window.location.pathname);
  } else {
    console.warn("[Meta Pixel] fbq not defined, cannot track PageView");
  }
};

export const trackEvent = (eventName, data = {}) => {
  if (window.fbq) {
    window.fbq("track", eventName, data);
    console.log(`[Meta Pixel] Event tracked: ${eventName}`, data);
  } else {
    console.warn(`[Meta Pixel] fbq not defined, cannot track event: ${eventName}`);
  }
};
