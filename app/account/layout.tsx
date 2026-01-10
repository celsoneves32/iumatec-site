// app/account/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserIdFromCookieHeader } from "@/lib/auth";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieHeader = (await headers()).get("cookie") || "";
  const userId = await getUserIdFromCookieHeader(cookieHeader);

  if (!userId) {
    redirect("/login?next=/account");
  }

  return <>{children}</>;
}
