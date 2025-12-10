"use client";

import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/konto");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  return <>{children}</>;
}
