// All LKR amounts are whole rupees (integers). This is the only place prices
// become strings — never interpolate `Rs. ${x}` inline.
const lkrFormatter = new Intl.NumberFormat("en-LK", {
  maximumFractionDigits: 0,
});

export function formatLKR(amount: number): string {
  return `Rs. ${lkrFormatter.format(amount)}`;
}
