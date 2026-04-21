import { BrowserPersona } from "@/types";
import { weightedRandom, randomInt } from "@/lib/random";
import { SPANISH_VIEWPORTS } from "@/lib/constants";

const CHROME_VERSIONS = [
  "131.0.6778.86",
  "131.0.6778.109",
  "132.0.6834.57",
  "132.0.6834.83",
  "133.0.6847.100",
  "133.0.6876.39",
  "133.0.6876.59",
  "134.0.6943.35",
  "134.0.6943.70",
  "134.0.6943.98",
  "134.0.6998.17",
  "135.0.7023.40",
  "135.0.7023.63",
  "135.0.7049.42",
  "135.0.7049.84",
  "136.0.7103.25",
  "136.0.7103.49",
  "136.0.7103.73",
];

interface OSConfig {
  platform: string;
  uaOS: string;
  weight: number;
}

const OS_CONFIGS: OSConfig[] = [
  { platform: "Win32", uaOS: "Windows NT 10.0; Win64; x64", weight: 65 },
  { platform: "Win32", uaOS: "Windows NT 11.0; Win64; x64", weight: 15 },
  { platform: "MacIntel", uaOS: "Macintosh; Intel Mac OS X 10_15_7", weight: 12 },
  { platform: "MacIntel", uaOS: "Macintosh; Intel Mac OS X 14_0", weight: 8 },
];

const DEVICE_CONFIGS = [
  { deviceMemory: 8, hardwareConcurrency: 8, weight: 40 },
  { deviceMemory: 16, hardwareConcurrency: 8, weight: 25 },
  { deviceMemory: 16, hardwareConcurrency: 12, weight: 15 },
  { deviceMemory: 4, hardwareConcurrency: 4, weight: 10 },
  { deviceMemory: 32, hardwareConcurrency: 16, weight: 10 },
];

export function generatePersona(): BrowserPersona {
  const chromeVersion =
    CHROME_VERSIONS[randomInt(0, CHROME_VERSIONS.length - 1)];
  const os = weightedRandom(OS_CONFIGS) as Omit<OSConfig, "weight">;
  const device = weightedRandom(DEVICE_CONFIGS) as {
    deviceMemory: number;
    hardwareConcurrency: number;
  };
  const viewport = weightedRandom(SPANISH_VIEWPORTS) as {
    width: number;
    height: number;
  };

  const userAgent = `Mozilla/5.0 (${os.uaOS}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

  return {
    userAgent,
    viewport,
    platform: os.platform,
    deviceMemory: device.deviceMemory,
    hardwareConcurrency: device.hardwareConcurrency,
    locale: "es-ES",
    timezone: "Europe/Madrid",
  };
}

export function getStealthScripts(persona: BrowserPersona): string {
  return `
    // Override navigator properties for consistency
    Object.defineProperty(navigator, 'platform', { get: () => '${persona.platform}' });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${persona.deviceMemory} });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${persona.hardwareConcurrency} });
    Object.defineProperty(navigator, 'language', { get: () => '${persona.locale}' });
    Object.defineProperty(navigator, 'languages', { get: () => ['${persona.locale}', 'es', 'en'] });

    // Mask webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // Chrome runtime
    if (!window.chrome) {
      window.chrome = { runtime: {} };
    }

    // Permissions API
    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery(parameters);
      };
    }

    // WebGL vendor/renderer
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.call(this, parameter);
    };

    // Plugin count (Chrome typically has plugins)
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ];
        plugins.length = 3;
        return plugins;
      }
    });
  `;
}
