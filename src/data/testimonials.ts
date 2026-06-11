// Seeded testimonials for the marketing site (replace with real reviews as
// they arrive). Data-driven content like occasions — Sinhala/Tamil locales
// get parallel files.
export interface Testimonial {
  name: string;
  location: string;
  quote: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Nadeesha",
    location: "Colombo",
    quote:
      "Made our homecoming album on my phone during the honeymoon. The print quality genuinely surprised the photographer.",
  },
  {
    name: "Kasun",
    location: "Kandy",
    quote:
      "Auto-fill arranged 200 trip photos by date in seconds. I just fixed a few pages and ordered. Arrived in five days.",
  },
  {
    name: "Dilini",
    location: "Galle",
    quote:
      "I make one every year for my daughter's birthday. The proof on WhatsApp before printing is what keeps me coming back.",
  },
  {
    name: "Tharindu",
    location: "Negombo",
    quote:
      "Ordered cash on delivery, slightly suspicious it was too easy. The book that arrived shut me up. Thick pages, rich colour.",
  },
  {
    name: "Sachini",
    location: "Kurunegala",
    quote:
      "Made an Avurudu album with photos from four phones. Started on my laptop, finished on the bus from a WhatsApp link.",
  },
];
