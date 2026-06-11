import { images } from "@/data/images";

// SEO occasion landers (/occasions/[slug]) + the home occasion grid.
// Copy targets "wedding photobook sri lanka"-class queries; all strings live
// here (occasion copy is data-driven content, mirrored to en.ts style rules —
// Sinhala/Tamil versions become parallel data files).
export interface Occasion {
  slug: string;
  title: string;
  blurb: string;
  heroTitle: string;
  heroBody: string;
  seoTitle: string;
  seoDescription: string;
  image: string;
  imageAlt: string;
}

export const OCCASIONS: Occasion[] = [
  {
    slug: "wedding-photobooks",
    title: "Weddings & homecomings",
    blurb: "The poruwa, the dancing, the going-away — bound beautifully.",
    heroTitle: "Wedding photobooks, printed in Sri Lanka",
    heroBody:
      "From the poruwa ceremony to the homecoming, your wedding deserves more than a pen drive from the photographer. Pick your favourites, lay them out in minutes, and hold the day in your hands — a hardcover album printed in Colombo and delivered island-wide.",
    seoTitle: "Wedding Photobooks Sri Lanka — Printed in Colombo",
    seoDescription:
      "Turn your wedding and homecoming photos into a premium hardcover photobook. Designed online, printed in Colombo, cash on delivery available.",
    image: images.occasions.wedding,
    imageAlt: "A wedding photobook lying open on a table",
  },
  {
    slug: "baby-first-year",
    title: "Baby's first year",
    blurb: "Twelve months of firsts, from first yawn to first steps.",
    heroTitle: "Baby photobooks for the fastest year of all",
    heroBody:
      "The first smile, the first kottu-stained grin, the first wobbly steps — the first year disappears fast. Collect it month by month in a book the grandparents will fight over.",
    seoTitle: "Baby Photobooks Sri Lanka — First Year Albums",
    seoDescription:
      "Create a baby's first year photobook online. Premium printing in Colombo, delivered anywhere in Sri Lanka.",
    image: images.occasions.baby,
    imageAlt: "A baby photobook with a first-birthday photograph",
  },
  {
    slug: "travel-photobooks",
    title: "Travel",
    blurb: "Ella by train, Sigiriya at dawn, the deep south by tuk-tuk.",
    heroTitle: "Travel photobooks — keep the trip",
    heroBody:
      "The 6am train to Ella, the climb up Sigiriya, three days of string hopper breakfasts down south. Drop your camera roll in, let auto-fill arrange it by date, and your trip becomes a book before the tan fades.",
    seoTitle: "Travel Photobooks Sri Lanka — Print Your Adventures",
    seoDescription:
      "Make a travel photobook from your trip photos in minutes. Auto-arranged by date, printed in Colombo, delivered island-wide.",
    image: images.occasions.travel,
    imageAlt: "A travel photobook with a photo of the Nine Arches Bridge",
  },
  {
    slug: "graduation-photobooks",
    title: "Graduation",
    blurb: "The convocation, the gown, everyone who got you there.",
    heroTitle: "Graduation photobooks worth the years behind them",
    heroBody:
      "One ceremony, years of work, and a family bursting with pride. Gather the convocation shots, the campus memories and the celebration dinner into a hardcover keepsake.",
    seoTitle: "Graduation Photobooks Sri Lanka",
    seoDescription:
      "Celebrate graduation with a premium photobook. Designed online, printed in Colombo, delivered across Sri Lanka.",
    image: images.occasions.graduation,
    imageAlt: "A graduation photobook with a convocation photograph",
  },
  {
    slug: "avurudu-family-albums",
    title: "Avurudu family albums",
    blurb: "Kiribath, crackers and the whole family in one place.",
    heroTitle: "Avurudu albums — the whole family, once a year",
    heroBody:
      "Avurudu is the one time everyone is under the same roof: the kiribath table, the games, the four generations on one verandah. Make the album that comes out again every April.",
    seoTitle: "Avurudu Family Photo Albums Sri Lanka",
    seoDescription:
      "Turn New Year family photos into a beautiful album. Printed in Colombo, cash on delivery in Colombo & suburbs.",
    image: images.occasions.avurudu,
    imageAlt: "A family album open at an Avurudu celebration spread",
  },
  {
    slug: "christmas-photobooks",
    title: "Christmas",
    blurb: "The tree, the table, the people who make December bright.",
    heroTitle: "Christmas photobooks & gifts that mean something",
    heroBody:
      "Better than another mug: a book of the year's best moments, wrapped and under the tree. Order by mid-December for guaranteed Christmas delivery.",
    seoTitle: "Christmas Photobooks Sri Lanka — Personalised Gifts",
    seoDescription:
      "Create a personalised Christmas photobook gift. Premium hardcover printing in Colombo, island-wide delivery.",
    image: images.occasions.christmas,
    imageAlt: "A Christmas photobook beside pine branches",
  },
];

export function getOccasion(slug: string): Occasion | undefined {
  return OCCASIONS.find((occasion) => occasion.slug === slug);
}
