import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, Palmtree, Briefcase, Settings, LogOut, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-mudaflor.jpg";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Colaboradores", url: "/colaboradores", icon: Users },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Férias", url: "/ferias", icon: Palmtree },
  { title: "Recrutamento", url: "/recrutamento", icon: Briefcase },
  { title: "Gestão", url: "/gestao", icon: BarChart3 },
];

const bottomItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/95 ring-1 ring-white/10">
            <img src={logo} alt="Mudaflor" className="h-7 w-7 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight text-sidebar-foreground">Mudaflor</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/40">People OS</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="group relative h-10 rounded-lg px-3 text-sidebar-foreground/75 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-primary/15 data-[active=true]:text-white data-[active=true]:font-medium"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {bottomItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-10 rounded-lg px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-white"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-full justify-start gap-3 px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}