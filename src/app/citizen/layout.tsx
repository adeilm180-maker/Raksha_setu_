import { redirect } from "next/navigation";
import { getUserRole, getSafeUser } from "@/lib/supabase/server";

// Gate for the citizen area: any logged-in user may look, but each role
// belongs to its own workspace - send them there instead.
export default async function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSafeUser();

  if (!user) redirect("/login");

  const role = await getUserRole();

  // Operators and Admins can view any console (including Citizen Portal) for testing and supervision
  switch (role) {
    case "FIELD_TEAM":
      redirect("/team");
    case "SHELTER_MANAGER":
      redirect("/shelter-manage");
    case "OPERATOR":
    case "ADMIN":
    case "CITIZEN":
    default:
      break;
  }

  return <>{children}</>;
}
