"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import type { InquiryRecord, ProjectRecord, ProjectStatus } from "@/lib/supabase";

const STATUS_OPTIONS: ProjectStatus[] = [
  "In Development",
  "Pre-Production",
  "In Production",
  "Post-Production",
  "Completed",
];

const emptyProject = {
  title: "",
  slug: "",
  synopsis: "",
  genre: "",
  director: "",
  poster_url: "",
  promotional_images: "",
  cast: "",
  production_crew: "",
  production_start_date: "",
  expected_release_date: "",
  production_status: "In Development" as ProjectStatus,
  is_published: true,
};

export function AdminDashboard({
  initialProjects,
  initialInquiries,
}: {
  initialProjects: ProjectRecord[];
  initialInquiries: InquiryRecord[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inquiry) => {
      const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        `${inquiry.first_name} ${inquiry.last_name}`.toLowerCase().includes(query) ||
        inquiry.email.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [inquiries, searchTerm, statusFilter]);

  const refreshDashboard = async () => {
    const response = await fetch("/api/admin/projects");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to refresh projects.");
    }
    setProjects(payload.projects ?? []);

    const inquiriesResponse = await fetch("/api/admin/inquiries");
    const inquiryPayload = await inquiriesResponse.json();
    if (!inquiriesResponse.ok) {
      throw new Error(inquiryPayload.error || "Failed to refresh inquiries.");
    }
    setInquiries(inquiryPayload.inquiries ?? []);
  };

  const handleProjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setError("");
    setIsSaving(true);

    const payload = {
      ...projectForm,
      cast: projectForm.cast ? projectForm.cast.split("\n").map((item) => item.trim()).filter(Boolean) : [],
      production_crew: projectForm.production_crew
        ? projectForm.production_crew.split("\n").map((item) => item.trim()).filter(Boolean)
        : [],
      promotional_images: projectForm.promotional_images
        ? projectForm.promotional_images.split("\n").map((item) => item.trim()).filter(Boolean)
        : [],
      ...(editingId ? { id: editingId } : {}),
      slug: projectForm.slug || projectForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
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

  const handleInquiryStatus = async (id: string, status: InquiryRecord["status"]) => {
    try {
      const response = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update the inquiry.");
      }
      setInquiries((current) =>
        current.map((inquiry) => (inquiry.id === id ? { ...inquiry, status } : inquiry)),
      );
      setNotice("Inquiry updated.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update the inquiry.");
    }
  };

  const handleInquiryDelete = async (id: string) => {
    try {
      const response = await fetch("/api/admin/inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete the inquiry.");
      }
      setInquiries((current) => current.filter((inquiry) => inquiry.id !== id));
      setNotice("Inquiry deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete the inquiry.");
    }
  };

  const startEditingProject = (project: ProjectRecord) => {
    setEditingId(project.id);
    setPosterPreviewUrl(project.poster_display_url ?? null);
    setProjectForm({
      title: project.title,
      slug: project.slug,
      synopsis: project.synopsis,
      genre: project.genre,
      director: project.director,
      poster_url: project.poster_url ?? "",
      promotional_images: project.promotional_images?.join("\n") ?? "",
      cast: project.cast?.join("\n") ?? "",
      production_crew: project.production_crew?.join("\n") ?? "",
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

      <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Total projects", value: projects.length },
          { label: "In production", value: projects.filter((project) => project.production_status === "In Production").length },
          { label: "Completed", value: projects.filter((project) => project.production_status === "Completed").length },
          { label: "Total inquiries", value: inquiries.length },
          { label: "New inquiries", value: inquiries.filter((inquiry) => inquiry.status === "new").length },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">{editingId ? "Edit project" : "Add project"}</h3>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setProjectForm(emptyProject);
                  setPosterPreviewUrl(null);
                }}
                className="text-sm text-zinc-300"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <form onSubmit={handleProjectSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={projectForm.title}
                onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Project title"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
              <input
                value={projectForm.slug}
                onChange={(event) => setProjectForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="Slug"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </div>

            <textarea
              value={projectForm.synopsis}
              onChange={(event) => setProjectForm((current) => ({ ...current, synopsis: event.target.value }))}
              placeholder="Synopsis"
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={projectForm.genre}
                onChange={(event) => setProjectForm((current) => ({ ...current, genre: event.target.value }))}
                placeholder="Genre"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
              <input
                value={projectForm.director}
                onChange={(event) => setProjectForm((current) => ({ ...current, director: event.target.value }))}
                placeholder="Director"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
              <select
                value={projectForm.production_status}
                onChange={(event) => setProjectForm((current) => ({ ...current, production_status: event.target.value as ProjectStatus }))}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status} className="bg-black text-white">
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="date"
                value={projectForm.production_start_date}
                onChange={(event) => setProjectForm((current) => ({ ...current, production_start_date: event.target.value }))}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
              <input
                type="date"
                value={projectForm.expected_release_date}
                onChange={(event) => setProjectForm((current) => ({ ...current, expected_release_date: event.target.value }))}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <textarea
                value={projectForm.cast}
                onChange={(event) => setProjectForm((current) => ({ ...current, cast: event.target.value }))}
                placeholder="Cast (one per line)"
                rows={4}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
              <textarea
                value={projectForm.production_crew}
                onChange={(event) => setProjectForm((current) => ({ ...current, production_crew: event.target.value }))}
                placeholder="Production crew (one per line)"
                rows={4}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </div>

            <div className="space-y-3">
              <textarea
                value={projectForm.promotional_images}
                onChange={(event) => setProjectForm((current) => ({ ...current, promotional_images: event.target.value }))}
                placeholder="Supporting image URLs (one per line)"
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
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

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-semibold text-white">Inquiries</h3>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name or email"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="responded">Responded</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredInquiries.length === 0 ? (
            <p className="text-sm text-zinc-400">No inquiries match your filters.</p>
          ) : (
            filteredInquiries.map((inquiry) => (
              <div key={inquiry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {inquiry.first_name} {inquiry.last_name}
                    </p>
                    <p className="text-sm text-zinc-400">{inquiry.email}</p>
                    <p className="text-sm text-zinc-400">{inquiry.phone_number}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(["new", "read", "responded"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleInquiryStatus(inquiry.id, status)}
                        className={inquiry.status === status ? "rounded-full bg-white px-2 py-1 text-black" : "rounded-full border border-white/15 px-2 py-1 text-zinc-200"}
                      >
                        {status}
                      </button>
                    ))}
                    <button onClick={() => handleInquiryDelete(inquiry.id)} className="rounded-full border border-rose-500/30 px-2 py-1 text-rose-200">Delete</button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-zinc-300">{inquiry.message}</p>
                <p className="mt-2 text-xs text-zinc-500">{new Date(inquiry.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
