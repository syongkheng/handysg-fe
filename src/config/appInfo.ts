import Constants from "expo-constants";

/** The app version from app.json ("expo.version"), e.g. "1.0.0". */
export const APP_VERSION: string = Constants.expoConfig?.version ?? "unknown";
