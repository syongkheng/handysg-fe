/**
 * Languages the app is available in. Only English for now: add an entry here only once its
 * translations exist, so the Language page never offers a language the app can't show.
 */
export const LANGUAGES = [{ code: "en", label: "English" }] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** The language the app is shown in. Fixed until there is more than one. */
export const CURRENT_LANGUAGE: (typeof LANGUAGES)[number] = LANGUAGES[0];
