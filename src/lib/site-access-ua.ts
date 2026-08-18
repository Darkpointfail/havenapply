/**
 * Lightweight User-Agent parsing for site-access security logs.
 * Not a full browser fingerprint — coarse device / OS / browser only.
 */

export type DeviceCategory = "mobile" | "tablet" | "desktop" | "unknown";

export type ParsedUserAgent = {
  deviceCategory: DeviceCategory;
  osName: string;
  osVersion: string;
  browserName: string;
  browserMajorVersion: string;
};

export function parseUserAgent(uaRaw: string | null | undefined): ParsedUserAgent {
  const ua = (uaRaw || "").trim();
  if (!ua) {
    return {
      deviceCategory: "unknown",
      osName: "unknown",
      osVersion: "",
      browserName: "unknown",
      browserMajorVersion: "",
    };
  }

  const deviceCategory = detectDevice(ua);
  const { osName, osVersion } = detectOs(ua);
  const { browserName, browserMajorVersion } = detectBrowser(ua);

  return { deviceCategory, osName, osVersion, browserName, browserMajorVersion };
}

function detectDevice(ua: string): DeviceCategory {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile/i.test(ua)) return "mobile";
  return "desktop";
}

function detectOs(ua: string): { osName: string; osVersion: string } {
  if (/Windows NT 10/i.test(ua)) return { osName: "Windows", osVersion: "10+" };
  if (/Windows NT 6\.3/i.test(ua)) return { osName: "Windows", osVersion: "8.1" };
  if (/Windows/i.test(ua)) return { osName: "Windows", osVersion: "" };
  const mac = ua.match(/Mac OS X (\d+[._]\d+)/i);
  if (mac) return { osName: "macOS", osVersion: (mac[1] || "").replace("_", ".") };
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android (\d+(\.\d+)?)/i);
    return { osName: "Android", osVersion: m?.[1] || "" };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const m = ua.match(/OS (\d+[._]\d+)/i);
    return { osName: "iOS", osVersion: (m?.[1] || "").replace("_", ".") };
  }
  if (/CrOS/i.test(ua)) return { osName: "Chrome OS", osVersion: "" };
  if (/Linux/i.test(ua)) return { osName: "Linux", osVersion: "" };
  return { osName: "unknown", osVersion: "" };
}

function detectBrowser(ua: string): { browserName: string; browserMajorVersion: string } {
  // Order matters (Edge/Chrome/Safari).
  const edge = ua.match(/Edg\/(\d+)/i);
  if (edge) return { browserName: "Edge", browserMajorVersion: edge[1] || "" };
  const opera = ua.match(/OPR\/(\d+)/i);
  if (opera) return { browserName: "Opera", browserMajorVersion: opera[1] || "" };
  const chrome = ua.match(/Chrome\/(\d+)/i);
  if (chrome && !/Chromium/i.test(ua)) {
    return { browserName: "Chrome", browserMajorVersion: chrome[1] || "" };
  }
  const firefox = ua.match(/Firefox\/(\d+)/i);
  if (firefox) return { browserName: "Firefox", browserMajorVersion: firefox[1] || "" };
  const safari = ua.match(/Version\/(\d+).*Safari/i);
  if (safari) return { browserName: "Safari", browserMajorVersion: safari[1] || "" };
  return { browserName: "unknown", browserMajorVersion: "" };
}
