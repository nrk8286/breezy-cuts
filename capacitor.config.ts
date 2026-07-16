import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.breezycuts.app",
  appName: "Breezy Cuts",
  webDir: "mobile-web",
  server: { url: "https://breezycutz.shop", cleartext: false, androidScheme: "https" },
  android: { allowMixedContent: false },
};
export default config;
