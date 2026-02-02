export function pageTitle(brandName: string | null | undefined, page: string) {
  const brand = (brandName ?? "").trim() || "WebCompliance";
  if (page === "Home") return brand;
  return `${page} | ${brand}`;
}
