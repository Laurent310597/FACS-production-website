export const EMAIL_MODES = Object.freeze({ DISABLED: "disabled", TEST: "test", LIVE: "live" });
export const PREVIEW_PROJECT_REF = "zpbdsfkihjwfhasbadmn";
export const PRODUCTION_PROJECT_REF = "bnfzbhgkkxzjrvdtrhyt";

export function resolveEmailMode(value) {
  const mode = String(value || EMAIL_MODES.DISABLED).trim().toLowerCase();
  return Object.values(EMAIL_MODES).includes(mode) ? mode : EMAIL_MODES.DISABLED;
}

export function assertDeliveryAllowed({ mode, deliveryType, supabaseUrl, requestOrigin }) {
  if (mode === EMAIL_MODES.DISABLED) {
    throw new Error("AR email is disabled in this environment.");
  }
  if (deliveryType === "test") return;
  if (deliveryType !== "live") throw new Error("Invalid delivery type.");
  if (mode !== EMAIL_MODES.LIVE) throw new Error("Live AR email is not enabled in this environment.");

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  if (projectRef !== PRODUCTION_PROJECT_REF) throw new Error("Live AR email is restricted to Supabase Production.");
  if (!/^https:\/\/(www\.)?facs\.vn$/i.test(String(requestOrigin || ""))) {
    throw new Error("Live AR email is restricted to the canonical FACS Production origin.");
  }
}

