import { ContactForm } from "@/components/contact-form";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <section className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-zinc-400">Contact</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Begin your next story.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-zinc-300">
            Share your project, partnership opportunity, or creative inquiry. We will respond with thoughtful next steps.
          </p>

          <div className="mt-10 space-y-5 text-zinc-300">
            <p>info@proximityproduction.com</p>
            <p></p>
            <p>New York · London · Lisbon</p>
          </div>
        </div>

        <ContactForm />
      </section>
    </main>
  );
}
