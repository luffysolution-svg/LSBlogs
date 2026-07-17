import { redirect } from "next/navigation";
import { isCmsAuthenticated } from "../../lib/cms/auth";
import AdminProviders from "./AdminProviders";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isCmsAuthenticated())) redirect("/login");
  return <AdminProviders>{children}</AdminProviders>;
}
