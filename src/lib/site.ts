export const site = {
  name: "NichoMachines",
  legalName: "Nicholaisen A/S",
  tagline: "6-Side Machining Cell ROI Calculator",
  description:
    "Estimate the time savings and payback period of a 6-Side Machining Cell — drilling, milling and grooving in one machine.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://6-sided-machining-center.nichomachines.com",
  email: "info@nicholaisen.dk",
} as const;

export type Site = typeof site;
