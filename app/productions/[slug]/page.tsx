import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatProjectDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

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

  const sourceMaterial = [
    { label: "Based on (original book title)", value: project.based_on },
    { label: "Publisher", value: project.publisher },
    { label: "Author", value: project.author },
  ].filter((field) => field.value?.trim());
  const productionCredits = [
    { label: "Producer", value: project.producer },
    { label: "Director", value: project.director },
    { label: "Screenplay", value: project.screenplay },
    { label: "Production Company", value: project.production_company },
    {
      label: "Executive Producer",
      value: project.executive_producers?.filter((name) => name.trim()).join(", "),
    },
  ].filter((field) => field.value?.trim());
  const productionTimeline = [
    { label: "Development Status", value: project.production_status },
    {
      label: "Production Date",
      value: project.production_start_date ? formatProjectDate(project.production_start_date) : "",
    },
    {
      label: "Expected Release Date",
      value: project.expected_release_date ? formatProjectDate(project.expected_release_date) : "",
    },
  ].filter((field) => field.value?.trim());
  const cast = project.cast?.filter((person) => person.trim()) ?? [];
  const productionCrew = project.production_crew?.filter((person) => person.trim()) ?? [];

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

        <div className="space-y-8">
          <section aria-labelledby="film-overview">
            <p id="film-overview" className="text-xs uppercase tracking-[0.4em] text-zinc-400">Film Overview</p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">{project.title}</h1>
            {project.genre.trim() ? <p className="mt-3 text-sm text-zinc-300">{project.genre}</p> : null}
            {project.synopsis.trim() ? (
              <p className="mt-6 text-lg leading-8 text-zinc-300">{project.synopsis}</p>
            ) : null}
          </section>

          {sourceMaterial.length ? (
            <section aria-labelledby="source-material" className="border-t border-white/10 pt-6">
              <h2 id="source-material" className="text-xs uppercase tracking-[0.4em] text-zinc-400">Source Material</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {sourceMaterial.map((field) => (
                  <div key={field.label}>
                    <dt className="text-sm text-zinc-400">{field.label}</dt>
                    <dd className="mt-1 text-white">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {productionCredits.length ? (
            <section aria-labelledby="production-credits" className="border-t border-white/10 pt-6">
              <h2 id="production-credits" className="text-xs uppercase tracking-[0.4em] text-zinc-400">Production Credits</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {productionCredits.map((field) => (
                  <div key={field.label}>
                    <dt className="text-sm text-zinc-400">{field.label}</dt>
                    <dd className="mt-1 text-white">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {productionTimeline.length ? (
            <section aria-labelledby="production-timeline" className="border-t border-white/10 pt-6">
              <h2 id="production-timeline" className="text-xs uppercase tracking-[0.4em] text-zinc-400">Production Timeline</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {productionTimeline.map((field) => (
                  <div key={field.label}>
                    <dt className="text-sm text-zinc-400">{field.label}</dt>
                    <dd className="mt-1 text-white">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </section>

      {cast.length || productionCrew.length ? (
        <section className="mt-16 grid gap-8 lg:grid-cols-2">
          {cast.length ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-xl font-semibold text-white">Cast</h2>
              <ul className="mt-5 space-y-2 text-zinc-300">
                {cast.map((person) => <li key={person}>{person}</li>)}
              </ul>
            </div>
          ) : null}

          {productionCrew.length ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-xl font-semibold text-white">Production crew</h2>
              <ul className="mt-5 space-y-2 text-zinc-300">
                {productionCrew.map((person) => <li key={person}>{person}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

    </main>
  );
}
