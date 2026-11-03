import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ProductionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <Link href="/productions" className="mb-8 inline-flex text-sm text-zinc-300 transition hover:text-white">
        ← Back to productions
      </Link>

      <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative h-[540px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900">
          <Image
            src={project.poster_display_url || (project.poster_url?.startsWith("storage://") ? null : project.poster_url) || "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1200&q=80"}
            alt={project.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">{project.genre}</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">{project.title}</h1>

          <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
            <span className="rounded-full border border-white/10 px-3 py-1.5">{project.production_status}</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">Directed by {project.director}</span>
          </div>

          <p className="text-lg leading-8 text-zinc-300">{project.synopsis}</p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Start date</p>
              <p className="mt-3 text-lg text-white">{project.production_start_date ?? "TBD"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Release</p>
              <p className="mt-3 text-lg text-white">{project.expected_release_date ?? "TBA"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold text-white">Cast</h2>
          <ul className="mt-5 space-y-2 text-zinc-300">
            {(project.cast ?? []).map((person) => (
              <li key={person}>• {person}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold text-white">Production crew</h2>
          <ul className="mt-5 space-y-2 text-zinc-300">
            {(project.production_crew ?? []).map((person) => (
              <li key={person}>• {person}</li>
            ))}
          </ul>
        </div>
      </section>

    </main>
  );
}
