// src/PageViewTracker.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initFacebookPixel } from "./facebookPixel";

export default function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    // Only initialize in production
    if (import.meta.env.PROD || process.env.NODE_ENV === "production") {
      initFacebookPixel();
    }
  }, []);

  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "PageView");
      console.log("[Meta Pixel] PageView tracked:", location.pathname);
    }
  }, [location.pathname]);

  return null;
}
