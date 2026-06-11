import { FadeIn } from "@/components/marketing/FadeIn";
import { en } from "@/i18n/en";

// Four-step process strip on the alternating sand background.
export function HowItWorks() {
  return (
    <section className="bg-sand">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <FadeIn>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {en.marketing.how.title}
          </h2>
        </FadeIn>
        <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {en.marketing.how.steps.map((step, index) => (
            <li key={step.title}>
              <FadeIn delayMs={index * 75}>
                {/* The <ol> already conveys order to assistive tech; the big
                    numeral is decorative. */}
                <span
                  aria-hidden="true"
                  className="font-display text-5xl font-semibold text-terracotta"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-ink/70">{step.body}</p>
              </FadeIn>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
