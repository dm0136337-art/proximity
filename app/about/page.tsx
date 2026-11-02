import Link from "next/link";

const pillars = [
  {
    title: "Creative Direction",
    text: "We craft experiences that marry cinematic visual language, emotional precision, and commercial clarity.",
  },
  {
    title: "Development & Production",
    text: "From concept to delivery, we shape stories with strategic planning, world-building, and on-set execution.",
  },
  {
    title: "Post & Exhibition",
    text: "We guide projects through finishing, campaign strategy, and release stewardship with a premium editorial eye.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <section className="grid items-end gap-10 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-zinc-400">About Proximity</p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            We build cinematic worlds with emotional precision.
          </h1>
        </div>
        <p className="text-lg leading-8 text-zinc-300">
          Proximity Production develops premium feature films, bold documentaries, and artful commercial narratives that move audiences and challenge convention.
        </p>
      </section>

      <section className="grid gap-10 border-t border-white/10 py-16 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">Our background</p>
          <h2 className="mt-5 text-3xl font-semibold text-white">Independent in spirit. World-class in craft.</h2>
        </div>
        <div className="space-y-6 text-zinc-300">
          <p>
            Founded in the belief that intimacy and scale are not opposites, Proximity Production brings together directors, writers, producers, and creative partners who care deeply about story and image.
          </p>
          <p>
            Our work spans narrative features, prestige documentaries, and commercial collaborations shaped by thoughtful direction, steep production values, and a rigorous commitment to the viewer experience.
          </p>
        </div>
      </section>

      <section className="grid gap-5 py-16 lg:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="rounded-3xl border border-white/10 bg-zinc-900 p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">{pillar.title}</p>
            <p className="mt-6 text-lg leading-8 text-zinc-200">{pillar.text}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-10 border-t border-white/10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">Mission & vision</p>
          <h2 className="mt-5 text-3xl font-semibold text-white">Stories that feel alive.</h2>
        </div>
        <div className="space-y-6 text-zinc-300">
          <p>
            Our mission is to create work that feels contemporary while remaining timeless, bringing honesty, texture, and emotional clarity to every frame.
          </p>
          <p>
            We work with artists and institutions who value intention, collaboration, and cinematic excellence across Europe, North America, and global festival circuits.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-gradient-to-r from-white/5 to-zinc-900 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">Let&apos;s build something meaningful</p>
        <Link href="/contact" className="mt-5 inline-flex rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200">
          Start a conversation
        </Link>
      </section>
    </main>
  );
}
