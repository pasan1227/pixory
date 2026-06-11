import { FadeIn } from "@/components/marketing/FadeIn";
import { TESTIMONIALS } from "@/data/testimonials";
import { en } from "@/i18n/en";

// Quiet testimonial cards on the alternating sand background.
export function Testimonials() {
  return (
    <section className="bg-sand">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <FadeIn>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {en.marketing.testimonials.title}
          </h2>
        </FadeIn>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <FadeIn
              key={testimonial.name}
              className="h-full"
              delayMs={(index % 3) * 75}
            >
              <figure className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-paper p-6">
                <blockquote className="font-display text-lg leading-snug">
                  {testimonial.quote}
                </blockquote>
                <figcaption className="text-sm text-ink/70">
                  <span className="block font-medium text-ink/80">
                    {testimonial.name}
                  </span>
                  {testimonial.location}
                </figcaption>
              </figure>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
