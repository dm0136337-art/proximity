"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import type { ProjectRecord, ProjectStatus } from "@/lib/supabase";

const STATUS_OPTIONS: ProjectStatus[] = [
  "In Development",
  "Pre-Production",
  "In Production",
  "Post-Production",
  "Completed",
  "Released",
  "On Hold",
];

const emptyProject = {
  title: "",
  synopsis: "",
  genre: "",
  based_on: "",
  author: "",
  publisher: "",
  producer: "",
  executive_producers: [""],
  director: "",
  screenplay: "",
  production_company: "",
  poster_url: "",
  production_start_date: "",
  expected_release_date: "",
  production_status: "In Development" as ProjectStatus,
  is_published: true,
};

function formatProjectDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function ProjectDateField({
  id,
  label,
  description,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="space-y-1.5">
        <p id={`${id}-label`} className="text-sm font-semibold text-white">{label}</p>
        <p id={`${id}-description`} className="text-sm leading-6 text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        onClick={openDatePicker}
        className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-left text-sm text-white transition hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {value ? formatProjectDate(value) : <span className="text-zinc-400">{placeholder}</span>}
      </button>
      <input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      />
    </div>
  );
}

export function AdminDashboard({
  initialProjects,
}: {
  initialProjects: ProjectRecord[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refreshDashboard = async () => {
    const response = await fetch("/api/admin/projects");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to refresh projects.");
    }
    setProjects(payload.projects ?? []);
  };

  const handleProjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setError("");
    setIsSaving(true);

    const payload = {
      ...projectForm,
      executive_producers: projectForm.executive_producers.map((item) => item.trim()).filter(Boolean),
      ...(editingId ? { id: editingId } : {}),
      slug: editingSlug || projectForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    };

    try {
      const response = await fetch("/api/admin/projects", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save the project.");
      }

      setProjectForm(emptyProject);
      setEditingId(null);
      setEditingSlug(null);
      setPosterPreviewUrl(null);
      setNotice("Project saved successfully.");
      await refreshDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save the project.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProjectDelete = async (id: string) => {
    if (!window.confirm("Delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete the project.");
      }
      setProjects((current) => current.filter((project) => project.id !== id));
      setNotice("Project removed.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete the project.");
    }
  };

  const startEditingProject = (project: ProjectRecord) => {
    setEditingId(project.id);
    setEditingSlug(project.slug);
    setPosterPreviewUrl(project.poster_display_url ?? null);
    setProjectForm({
      title: project.title,
      synopsis: project.synopsis,
      genre: project.genre,
      based_on: project.based_on ?? "",
      author: project.author ?? "",
      publisher: project.publisher ?? "",
      producer: project.producer ?? "",
      executive_producers: project.executive_producers?.length ? project.executive_producers : [""],
      director: project.director,
      screenplay: project.screenplay ?? "",
      production_company: project.production_company ?? "",
      poster_url: project.poster_url ?? "",
      production_start_date: project.production_start_date ?? "",
      expected_release_date: project.expected_release_date ?? "",
      production_status: project.production_status,
      is_published: project.is_published,
    });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "production-graphics");

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok || !payload.asset || !payload.previewUrl) {
        throw new Error(payload.error || "The image could not be uploaded.");
      }
      setProjectForm((current) => ({ ...current, poster_url: payload.asset }));
      setPosterPreviewUrl(payload.previewUrl);
      setNotice("Image uploaded successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The image could not be uploaded.");
    }
  };

  return (
    <div className="space-y-8">
      {notice ? <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</p> : null}
      {error ? <p className="rounded border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">{editingId ? "Edit project" : "Add project"}</h3>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setEditingSlug(null);
                  setProjectForm(emptyProject);
                  setPosterPreviewUrl(null);
                }}
                className="text-sm text-zinc-300"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <form onSubmit={handleProjectSubmit} className="space-y-5">
            <fieldset className="space-y-4">
              <legend className="mb-3 text-base font-semibold text-white">Basic Film Information</legend>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  aria-label="Film title"
                  required
                  value={projectForm.title}
                  onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Film title"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
                <input
                  aria-label="Genre"
                  value={projectForm.genre}
                  onChange={(event) => setProjectForm((current) => ({ ...current, genre: event.target.value }))}
                  placeholder="Genre"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-white/10 pt-5">
              <legend className="mb-3 text-base font-semibold text-white">Book Information</legend>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  aria-label="Based on"
                  value={projectForm.based_on}
                  onChange={(event) => setProjectForm((current) => ({ ...current, based_on: event.target.value }))}
                  placeholder="Based on (original book title)"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
                <input
                  aria-label="Author"
                  value={projectForm.author}
                  onChange={(event) => setProjectForm((current) => ({ ...current, author: event.target.value }))}
                  placeholder="Author"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
                <input
                  aria-label="Publisher"
                  value={projectForm.publisher}
                  onChange={(event) => setProjectForm((current) => ({ ...current, publisher: event.target.value }))}
                  placeholder="Publisher"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-white/10 pt-5">
              <legend className="mb-3 text-base font-semibold text-white">Production Credits</legend>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  aria-label="Producer"
                  value={projectForm.producer}
                  onChange={(event) => setProjectForm((current) => ({ ...current, producer: event.target.value }))}
                  placeholder="Producer"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
                <input
                  aria-label="Director"
                  value={projectForm.director}
                  onChange={(event) => setProjectForm((current) => ({ ...current, director: event.target.value }))}
                  placeholder="Director (if confirmed)"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
                <input
                  aria-label="Screenplay or written by"
                  value={projectForm.screenplay}
                  onChange={(event) => setProjectForm((current) => ({ ...current, screenplay: event.target.value }))}
                  placeholder="Screenplay / Written By (if confirmed)"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
                <input
                  aria-label="Production company"
                  value={projectForm.production_company}
                  onChange={(event) => setProjectForm((current) => ({ ...current, production_company: event.target.value }))}
                  placeholder="Production Company"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-zinc-300">Executive Producer</p>
                {projectForm.executive_producers.map((producer, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={producer}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          executive_producers: current.executive_producers.map((name, itemIndex) =>
                            itemIndex === index ? event.target.value : name,
                          ),
                        }))
                      }
                      aria-label={`Executive producer ${index + 1}`}
                      placeholder={`Executive Producer ${index + 1}`}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                    />
                    {projectForm.executive_producers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setProjectForm((current) => ({
                            ...current,
                            executive_producers: current.executive_producers.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        className="rounded-xl border border-white/10 px-3 text-sm text-zinc-300"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setProjectForm((current) => ({
                      ...current,
                      executive_producers: [...current.executive_producers, ""],
                    }))
                  }
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200"
                >
                  Add executive producer
                </button>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-white/10 pt-5">
              <legend className="mb-3 text-base font-semibold text-white">Film Description</legend>
              <textarea
                aria-label="Synopsis"
                value={projectForm.synopsis}
                onChange={(event) => setProjectForm((current) => ({ ...current, synopsis: event.target.value }))}
                placeholder="Synopsis"
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </fieldset>

            <fieldset className="space-y-4 border-t border-white/10 pt-5">
              <legend className="mb-3 text-base font-semibold text-white">Production Timeline</legend>
              <label className="block space-y-2">
                <span className="text-sm text-zinc-300">Development status</span>
                <select
                  aria-label="Development status"
                  value={projectForm.production_status}
                  onChange={(event) => setProjectForm((current) => ({ ...current, production_status: event.target.value as ProjectStatus }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white md:max-w-sm"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status} className="bg-black text-white">
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <ProjectDateField
                  id="production-start-date"
                  label="Production Date"
                  description=""
                  placeholder="Select production date"
                  value={projectForm.production_start_date}
                  onChange={(value) => setProjectForm((current) => ({ ...current, production_start_date: value }))}
                />
                <ProjectDateField
                  id="expected-release-date"
                  label="Expected Release Date"
                  description=""
                  placeholder="Select expected release date"
                  value={projectForm.expected_release_date}
                  onChange={(value) => setProjectForm((current) => ({ ...current, expected_release_date: value }))}
                />
              </div>
            </fieldset>

            <div className="space-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-200">
                Upload poster
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
              {posterPreviewUrl ||
              (projectForm.poster_url && !projectForm.poster_url.startsWith("storage://")) ? (
                <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-white/10">
                  <Image src={posterPreviewUrl || projectForm.poster_url} alt="Poster preview" fill className="object-cover" unoptimized />
                </div>
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={projectForm.is_published}
                onChange={(event) => setProjectForm((current) => ({ ...current, is_published: event.target.checked }))}
              />
              Publish project
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black"
            >
              {isSaving ? "Saving..." : editingId ? "Update project" : "Add project"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">Project library</h3>
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{project.title}</p>
                    <p className="text-xs text-zinc-400">{project.production_status}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {[
                        project.genre && `Genre: ${project.genre}`,
                        project.based_on && `Based on: ${project.based_on}`,
                        project.author && `Author: ${project.author}`,
                        project.publisher && `Publisher: ${project.publisher}`,
                        project.producer && `Producer: ${project.producer}`,
                        project.executive_producers?.length &&
                          `Executive Producer: ${project.executive_producers.join(", ")}`,
                        project.director && `Director: ${project.director}`,
                        project.screenplay && `Screenplay / Written By: ${project.screenplay}`,
                        project.production_company && `Production Company: ${project.production_company}`,
                      ]
                        .filter((value): value is string => Boolean(value))
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => startEditingProject(project)} className="rounded-full border border-white/15 px-2 py-1 text-zinc-200">Edit</button>
                    <button onClick={() => handleProjectDelete(project.id)} className="rounded-full border border-rose-500/30 px-2 py-1 text-rose-200">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
