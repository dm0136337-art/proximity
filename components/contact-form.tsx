"use client";

import { FormEvent, useMemo, useState } from "react";

const initialState = {
  first_name: "",
  last_name: "",
  phone_number: "",
  email: "",
  message: "",
  website: "",
};

export function ContactForm() {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");

  const isValidPhone = useMemo(() => {
    const phone = values.phone_number.trim();
    const digitCount = phone.replace(/\D/g, "").length;
    return /^\+?[0-9()\s.-]+$/.test(phone) && digitCount >= 7 && digitCount <= 15 && phone.length <= 32;
  }, [values.phone_number]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!values.first_name.trim()) nextErrors.first_name = "First name is required.";
    if (!values.last_name.trim()) nextErrors.last_name = "Last name is required.";
    if (!values.phone_number.trim()) nextErrors.phone_number = "Phone number is required.";
    if (!isValidPhone) nextErrors.phone_number = "Enter a valid phone number.";
    if (!values.email.trim()) nextErrors.email = "Email is required.";
    if (values.first_name.trim().length > 100) nextErrors.first_name = "Use 100 characters or fewer.";
    if (values.last_name.trim().length > 100) nextErrors.last_name = "Use 100 characters or fewer.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 254) {
      nextErrors.email = "Use a valid email address.";
    }
    if (!values.message.trim()) nextErrors.message = "Message is required.";
    if (values.message.trim().length < 10 || values.message.trim().length > 5000) {
      nextErrors.message = "Use between 10 and 5,000 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setServerMessage("");

    if (!validate()) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "We could not submit your inquiry.");
      }

      setValues(initialState);
      setErrors({});
      setStatus("success");
      setServerMessage("Your inquiry has been received. Our team will be in touch soon.");
    } catch (error) {
      setStatus("error");
      setServerMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="first_name" className="mb-2 block text-sm text-zinc-300">
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            maxLength={100}
            value={values.first_name}
            onChange={(event) => setValues((current) => ({ ...current, first_name: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
          {errors.first_name ? <p className="mt-2 text-sm text-rose-400">{errors.first_name}</p> : null}
        </div>

        <div>
          <label htmlFor="last_name" className="mb-2 block text-sm text-zinc-300">
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            maxLength={100}
            value={values.last_name}
            onChange={(event) => setValues((current) => ({ ...current, last_name: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
          {errors.last_name ? <p className="mt-2 text-sm text-rose-400">{errors.last_name}</p> : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="phone_number" className="mb-2 block text-sm text-zinc-300">
            Phone number
          </label>
          <input
            id="phone_number"
            name="phone_number"
            maxLength={32}
            value={values.phone_number}
            onChange={(event) => setValues((current) => ({ ...current, phone_number: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
          {errors.phone_number ? <p className="mt-2 text-sm text-rose-400">{errors.phone_number}</p> : null}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-zinc-300">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
          {errors.email ? <p className="mt-2 text-sm text-rose-400">{errors.email}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-sm text-zinc-300">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={5000}
          value={values.message}
          onChange={(event) => setValues((current) => ({ ...current, message: event.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
        />
        {errors.message ? <p className="mt-2 text-sm text-rose-400">{errors.message}</p> : null}
      </div>

      {status !== "idle" && serverMessage ? (
        <p
          className={status === "success" ? "text-sm text-emerald-400" : "text-sm text-rose-400"}
          role="status"
          aria-live="polite"
        >
          {serverMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Submitting..." : "Send Inquiry"}
      </button>
    </form>
  );
}
