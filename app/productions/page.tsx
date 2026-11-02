import Image from "next/image";
import Link from "next/link";
import { getPublishedProjects } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ProductionsPage() {
  const projects = await getPublishedProjects();

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <section className="mb-16">
        <p className="text-xs uppercase tracking-[0.45em] text-zinc-400">Portfolio</p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Selected productions.
        </h1>
      </section>

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-12 text-center text-zinc-300">
          No published projects are available yet.
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.id} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-900">
              <div className="relative h-96 overflow-hidden">
                <Image
                  src={project.poster_display_url || (project.poster_url?.startsWith("storage://") ? null : project.poster_url) || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80"}
                  alt={project.title}
                  fill
                  className="object-cover transition duration-500 hover:scale-105"
                  unoptimized
                />
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-zinc-400">
                  <span>{project.genre}</span>
                  <span>{project.production_status}</span>
                </div>
                <h2 className="text-2xl font-semibold text-white">{project.title}</h2>
                <p className="line-clamp-4 text-zinc-300">{project.synopsis}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-zinc-400">Directed by {project.director}</span>
                  <Link href={`/productions/${project.slug}`} className="text-sm text-white underline-offset-4 hover:underline">
                    View project
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
