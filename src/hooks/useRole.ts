import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "rh";

export function useRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return { roles: [] as AppRole[], userId: null as string | null };
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (error) throw error;
      return { roles: (data ?? []).map((r) => r.role as AppRole), userId: uid };
    },
  });
}

export function useIsAdmin() {
  const { data } = useRoles();
  return !!data?.roles.includes("admin");
}
