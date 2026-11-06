export const THEME_STORAGE_KEY = "intrinsic-ap-theme";

/** Runs before paint so the stored theme applies with no flash. Light is the default. */
export const themeBootScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=s==="dark"?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;
