import {
  CalendarDays,
  Clock3,
  History,
  Home,
  PlusCircle,
  Settings,
  Share2,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: Home,
  },
  {
    label: "Create",
    path: "/create",
    icon: PlusCircle,
  },
  {
    label: "Schedule",
    path: "/schedule",
    icon: CalendarDays,
  },
  {
    label: "History",
    path: "/history",
    icon: History,
  },
  {
    label: "Accounts",
    path: "/accounts",
    icon: Share2,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
] as const;

export const SECONDARY_NAV_ITEM = {
  label: "Install",
  path: "/install",
  icon: Clock3,
} as const;
