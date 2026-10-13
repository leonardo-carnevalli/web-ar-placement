/** The features the page asks for. Only hit-test is required; the rest improve the result when present. */
export const AR_SESSION_INIT = {
  requiredFeatures: ["hit-test"],
  optionalFeatures: ["dom-overlay", "light-estimation", "camera-access"],
} satisfies XRSessionInit;
