import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.breezycuts.app",
  appName: "Breezy Cuts",
  webDir: "mobile-web",
  server: { url: "https://breezy-cuts-app.nrk8286.workers.dev", cleartext: false, androidScheme: "https" },
  android: { allowMixedContent: false },
};
export default config;
