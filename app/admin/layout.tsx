export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">{children}</div>;
}
