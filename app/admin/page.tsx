import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminDashboardData } from "@/lib/supabase";
import { requireAdminLogin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await requireAdminLogin();

  if (!authenticated) {
    redirect("/admin/login");
  }

  const dashboardData = await getAdminDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-zinc-400">Dashboard</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Proximity control room</h1>
        </div>
        <form action="/api/admin/logout" method="post">
          <button type="submit" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white hover:text-black">
            Log out
          </button>
        </form>
      </div>

      <AdminDashboard initialProjects={dashboardData.projects} initialInquiries={dashboardData.inquiries} />
    </div>
  );
}
