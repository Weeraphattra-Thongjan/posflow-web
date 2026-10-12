export const thb = (n: number) =>
  "฿" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export const fmtDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "numeric", year: "numeric" }).format(date);
};

export const fmtDateTime = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
};
