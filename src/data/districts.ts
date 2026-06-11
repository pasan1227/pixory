// The canonical list of all 25 Sri Lankan districts. Do not redeclare elsewhere.
export const DISTRICTS = [
  { id: "ampara", label: "Ampara" },
  { id: "anuradhapura", label: "Anuradhapura" },
  { id: "badulla", label: "Badulla" },
  { id: "batticaloa", label: "Batticaloa" },
  { id: "colombo", label: "Colombo" },
  { id: "galle", label: "Galle" },
  { id: "gampaha", label: "Gampaha" },
  { id: "hambantota", label: "Hambantota" },
  { id: "jaffna", label: "Jaffna" },
  { id: "kalutara", label: "Kalutara" },
  { id: "kandy", label: "Kandy" },
  { id: "kegalle", label: "Kegalle" },
  { id: "kilinochchi", label: "Kilinochchi" },
  { id: "kurunegala", label: "Kurunegala" },
  { id: "mannar", label: "Mannar" },
  { id: "matale", label: "Matale" },
  { id: "matara", label: "Matara" },
  { id: "monaragala", label: "Monaragala" },
  { id: "mullaitivu", label: "Mullaitivu" },
  { id: "nuwara-eliya", label: "Nuwara Eliya" },
  { id: "polonnaruwa", label: "Polonnaruwa" },
  { id: "puttalam", label: "Puttalam" },
  { id: "ratnapura", label: "Ratnapura" },
  { id: "trincomalee", label: "Trincomalee" },
  { id: "vavuniya", label: "Vavuniya" },
] as const;

export type DistrictId = (typeof DISTRICTS)[number]["id"];

export const DISTRICT_IDS = DISTRICTS.map((d) => d.id) as [
  DistrictId,
  ...DistrictId[],
];

export function isDistrictId(value: string): value is DistrictId {
  return DISTRICTS.some((d) => d.id === value);
}
