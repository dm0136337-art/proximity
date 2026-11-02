import Image from "next/image";
import Link from "next/link";
import { getPublishedProjects } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await getPublishedProjects();

  return (
    <main>
      <section className="relative isolate flex min-h-[80vh] items-center overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          autoPlay
          muted
          loop
          playsInline
          src="https://videos.pexels.com/video-files/854474/854474-hd_1920_1080.mp4"
        />
        <div className="absolute inset-0 bg-black/65" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.45em] text-zinc-300">Proximity Production</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            We create stories that move.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-200">
            A cinematic production company crafting premium features, documentaries, and cultural narratives with emotional depth and visual precision.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/productions" className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200">
              Explore our work
            </Link>
            <Link href="/contact" className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
              Start a project
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">Featured films</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Selected productions</h2>
          </div>
          <Link href="/productions" className="text-sm text-zinc-300 transition hover:text-white">
            View all
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {projects.slice(0, 3).map((project) => (
            <article key={project.id} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-900">
              <div className="relative h-96">
                <Image
                  src={project.poster_display_url || (project.poster_url?.startsWith("storage://") ? null : project.poster_url) || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80"}
                  alt={project.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-zinc-400">
                  <span>{project.genre}</span>
                  <span>{project.production_status}</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">{project.title}</h3>
                <p className="text-zinc-300">{project.synopsis}</p>
                <Link href={`/productions/${project.slug}`} className="inline-flex text-sm text-white underline-offset-4 hover:underline">
                  Read more
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">About</p>
            <h2 className="text-4xl font-semibold text-white">Crafted for audiences who feel deeply.</h2>
          </div>
          <div className="space-y-6 text-lg leading-8 text-zinc-300">
            <p>
              We create intimate, cinematic experiences grounded in careful observation, character, and atmosphere.
            </p>
            <p>
              Proximity Production moves between development, production, and post with a highly collaborative process built around trust, vision, and excellence.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-900 p-8 sm:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">Pitch your story</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Let’s shape the next cinematic chapter.</h2>
            </div>
            <Link href="/contact" className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
