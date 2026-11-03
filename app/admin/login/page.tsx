"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const isSubmitting = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) {
      return;
    }

    isSubmitting.current = true;
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "This account is not authorized to access the dashboard.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      isSubmitting.current = false;
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-16">
      <div className="w-full rounded-[2rem] border border-white/10 bg-zinc-900 p-8 shadow-2xl shadow-black/20">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              autoComplete="username"
              required
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-zinc-300">
              Password
            </label>
            <input
              id="password"
              value={password}
              type="password"
              autoComplete="current-password"
              required
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
            />
          </div>

          {status === "error" ? <p className="text-sm text-rose-400">{message}</p> : null}

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "loading" ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
