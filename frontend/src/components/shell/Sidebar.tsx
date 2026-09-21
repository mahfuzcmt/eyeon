"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, type StringKey } from "@/lib/i18n";
import { useSession } from "@/lib/session-context";

/**
 * ADL-style two-panel sidebar navigation
 * Left: Thin colored icon strip
 * Right: White content panel with navigation items
 */

interface NavSection {
  id: string;
  label: StringKey;
  icon: React.ReactNode;
  href?: string;
  color: string;        // Icon strip background color
  activeColor: string;  // Active state color
  children?: NavItem[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

interface NavItem {
  href: string;
  label: StringKey;
  icon: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: "monitor",
    label: "nav.monitor",
    icon: <MonitorIcon />,
    href: "/dashboard",
    color: "#0421bc",      // ADL teal - consistent across all
    activeColor: "#031a96",
  },
  {
    id: "statistics",
    label: "nav.statistics",
    icon: <StatisticsIcon />,
    color: "#0421bc",      // ADL teal - consistent across all
    activeColor: "#031a96",
    children: [
      { href: "/dashboard/home", label: "nav.home", icon: <HomeIcon /> },
      { href: "/dashboard/reports", label: "nav.reports", icon: <ReportIcon /> },
      { href: "/dashboard/trips", label: "nav.trips", icon: <TripsIcon /> },
    ],
  },
  {
    id: "manage",
    label: "nav.manage",
    icon: <ManageIcon />,
    color: "#0421bc",      // ADL teal - consistent across all
    activeColor: "#031a96",
    children: [
      { href: "/dashboard/devices", label: "nav.vehicles", icon: <DeviceIcon /> },
      { href: "/dashboard/drivers", label: "nav.drivers", icon: <DriverIcon /> },
      { href: "/dashboard/geofences", label: "nav.geofences", icon: <GeofenceIcon /> },
      { href: "/dashboard/alarms", label: "nav.alarms", icon: <AlarmIcon /> },
      { href: "/dashboard/rules", label: "nav.rules", icon: <RulesIcon /> },
      { href: "/dashboard/scheduled", label: "nav.scheduled", icon: <ScheduledIcon /> },
      { href: "/dashboard/settings", label: "nav.settings", icon: <SettingsIcon /> },
      { href: "/dashboard/audit-log", label: "nav.auditLog", icon: <AuditIcon />, adminOnly: true },
    ],
  },
  {
    id: "customer",
    label: "nav.customer",
    icon: <CustomerIcon />,
    href: "/dashboard/admin",
    color: "#0421bc",      // ADL teal - consistent across all
    activeColor: "#031a96",
    superAdminOnly: true,
  },
];

interface SidebarProps {
  /** Render as the flat mobile drawer (all sections + pages in one list). */
  mobile?: boolean;
  /** Called after a link is chosen in mobile mode so the drawer can close. */
  onNavigate?: () => void;
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { role } = useSession();
  const isAdmin = role === "ORG_ADMIN" || role === "SUPER_ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Which section is selected in the icon strip
  const [activeSection, setActiveSection] = useState<string>("monitor");
  // Track expanded sections in the content panel
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["monitor"]));
  // Collapsed state (icon-only mode)
  const [collapsed, setCollapsed] = useState(false);

  // Auto-select section based on active route
  useEffect(() => {
    for (const section of NAV_SECTIONS) {
      if (section.href && isActive(section.href)) {
        setActiveSection(section.id);
        break;
      }
      if (section.children) {
        const hasActiveChild = section.children.some((item) =>
          item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
        );
        if (hasActiveChild) {
          setActiveSection(section.id);
          setExpandedSections((prev) => new Set([...prev, section.id]));
          break;
        }
      }
    }
  }, [pathname]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const filterItems = (items: NavItem[] | undefined) =>
    items?.filter((item) => {
      if (item.superAdminOnly && !isSuperAdmin) return false;
      if (item.adminOnly && !isAdmin) return false;
      return true;
    }) ?? [];

  const filterSections = (sections: NavSection[]) =>
    sections.filter((section) => {
      if (section.superAdminOnly && !isSuperAdmin) return false;
      if (section.adminOnly && !isAdmin) return false;
      return true;
    });

  const currentSection = NAV_SECTIONS.find((s) => s.id === activeSection);

  if (mobile) {
    return (
      <div className="flex h-full w-full flex-col bg-white">
        {/* Brand header */}
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-surface-300 bg-brand-500 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#0421bc" />
              <path d="M2 17l10 5 10-5" stroke="#0421bc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="#0421bc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base font-bold text-white">EyeOn</span>
          <button
            type="button"
            onClick={onNavigate}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Flat navigation: every section and its pages, one tap away */}
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
          {filterSections(NAV_SECTIONS).map((section) => {
            const items = section.href
              ? [{ href: section.href, label: section.label, icon: section.icon }]
              : filterItems(section.children);
            return (
              <div key={section.id} className="px-2 pb-2">
                <div className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                  {t(section.label)}
                </div>
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex min-h-[44px] items-center gap-3 rounded-md px-3 text-[15px] transition-colors ${
                        active ? "bg-brand-500/10 font-medium text-ink-900" : "text-ink-700 active:bg-surface-100"
                      }`}
                    >
                      <span className={active ? "text-brand-500" : "text-ink-400"}>{item.icon}</span>
                      <span>{t(item.label)}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-surface-300 px-4 py-3 text-[12px] text-ink-400">
          EyeOn GPS Tracking
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[2000] flex h-full">
      {/* Left icon rail — ADL: solid primary blue with white glyphs */}
      <div className="flex w-[52px] flex-col bg-brand-500">
        {/* Logo */}
        <div className="flex h-[56px] items-center justify-center border-b border-white/15">
          <Link href="/dashboard" aria-label="EyeOn">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#0421bc" />
                <path d="M2 17l10 5 10-5" stroke="#0421bc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="#0421bc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Icon Navigation */}
        <nav className="flex-1 flex flex-col items-center py-2 gap-1">
          {filterSections(NAV_SECTIONS).map((section) => {
            const isCurrentSection = activeSection === section.id;
            const hasActiveRoute = section.href
              ? isActive(section.href)
              : section.children?.some((c) => isActive(c.href));

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveSection(section.id);
                  if (section.href) router.push(section.href);
                }}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  isCurrentSection || hasActiveRoute
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                title={t(section.label)}
              >
                {section.icon}
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-full z-10 ml-2 hidden whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-[13px] text-white group-hover:block">
                  {t(section.label)}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-white/15 p-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right Content Panel - only for sections with sub-pages. Direct sections
          (Monitor, Customer) go straight to their page so the map keeps its width. */}
      {!collapsed && !currentSection?.href && (
        <div className="flex w-[180px] flex-col border-r border-surface-300 bg-white">
          {/* Section header — ADL: section name in primary blue */}
          <div className="flex h-[56px] items-center border-b border-surface-300 px-4">
            <span className="text-[15px] font-semibold text-brand-500">
              {currentSection ? t(currentSection.label) : ""}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-2">
            {currentSection?.href ? (
              // Direct link section
              <Link
                href={currentSection.href}
                className={`flex items-center gap-2.5 rounded px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  isActive(currentSection.href)
                    ? "bg-brand-500/10 text-ink-900"
                    : "text-ink-700 hover:bg-surface-100"
                }`}
              >
                <span>{currentSection.icon}</span>
                <span>{t(currentSection.label)}</span>
              </Link>
            ) : (
              // Section with children
              <div className="space-y-1">
                {filterItems(currentSection?.children).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded px-3 py-2 text-[14px] transition-colors ${
                      isActive(item.href)
                        ? "bg-brand-500/10 font-medium text-ink-900"
                        : "text-ink-700 hover:bg-surface-100"
                    }`}
                  >
                    <span className={isActive(item.href) ? "text-brand-500" : "text-ink-400"}>
                      {item.icon}
                    </span>
                    <span>{t(item.label)}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Brand Footer */}
          <div className="border-t border-surface-300 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-semibold text-ink-800">EyeOn</span>
                <span className="text-[11px] text-ink-400">GPS Tracking</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */
const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MonitorIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function StatisticsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function ManageIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CustomerIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <rect x="9.5" y="14" width="5" height="7" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <rect x="3" y="6" width="13" height="12" rx="1" />
      <path d="M16 10h3l2 2v4h-5" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </svg>
  );
}

function DriverIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function GeofenceIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M4 8 12 4l8 4v8l-8 4-8-4V8Z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function TripsIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M5 18c4-8 10-8 14 0" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
    </svg>
  );
}

function AlarmIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M6 8a6 6 0 0 1 12 0v6l2 3H4l2-3V8Z" />
      <path d="M10 19a2 2 0 1 0 4 0" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6M8 13h8M8 17h6" />
    </svg>
  );
}

function RulesIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function ScheduledIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <path d="M5 4h14v16H5z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...ICON_PROPS} width="16" height="16">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}
