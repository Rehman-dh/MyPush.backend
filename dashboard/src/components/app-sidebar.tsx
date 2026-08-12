"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Check,
  ChevronsUpDown,
  LayoutDashboard,
  LayoutGrid,
  Send,
  Settings,
  Smartphone,
  Radio,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export interface AppSummary {
  id: string;
  name: string;
}

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "compose", label: "Compose", icon: Send },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "devices", label: "Devices", icon: Smartphone },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar({
  apps,
  activeAppId,
}: {
  apps: AppSummary[];
  activeAppId: string;
}) {
  const pathname = usePathname();
  const activeApp = apps.find((a) => a.id === activeAppId);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Radio className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeApp?.name ?? "Select app"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Push Dashboard
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="right"
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Apps
                </DropdownMenuLabel>
                {apps.map((app) => (
                  <DropdownMenuItem key={app.id} asChild className="gap-2">
                    <Link href={`/apps/${app.id}/dashboard`}>
                      <span className="truncate">{app.name}</span>
                      {app.id === activeAppId && (
                        <Check className="ml-auto size-4" />
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2">
                  <Link href="/apps">
                    <LayoutGrid className="size-4" />
                    All apps
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Messaging</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const href = `/apps/${activeAppId}/${item.key}`;
              const isActive = pathname === href || pathname.startsWith(href + "/");
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <Link href={href}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
