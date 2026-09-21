"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useAdminStats, useAdminOrgs, useAdminDevices } from "@/hooks/useAdminData";
import { useAdminBillingStats, useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import type { OrgAdminView, OrgCreate, DeviceAdminView, SubscriptionView, ExtendRequest, DeviceWithoutSub, CreateSubscriptionRequest } from "@/types/domain";
import { formatRelative } from "@/lib/format";

type Tab = "orgs" | "devices" | "subscriptions";

export default function AdminPage() {
  const { t, locale } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("orgs");

  const { stats, loading: statsLoading } = useAdminStats();

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-50">
      {/* Header */}
      <div className="shrink-0 border-b border-surface-300 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-ink-900">Super Admin Panel</h1>
        <p className="text-[13px] text-ink-500">Manage organizations and device assignments</p>
      </div>

      {/* Stats Bar */}
      <div className="shrink-0 border-b border-surface-300 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-6">
          <StatCard
            label="Organizations"
            value={stats?.totalOrgs ?? 0}
            sub={`${stats?.activeOrgs ?? 0} active`}
            loading={statsLoading}
          />
          <StatCard
            label="Devices"
            value={stats?.totalDevices ?? 0}
            sub={`${stats?.onlineDevices ?? 0} online`}
            loading={statsLoading}
          />
          <StatCard
            label="Users"
            value={stats?.totalUsers ?? 0}
            loading={statsLoading}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 border-b border-surface-300 bg-white px-4">
        <div className="flex gap-4">
          <TabButton
            active={activeTab === "orgs"}
            onClick={() => setActiveTab("orgs")}
          >
            Organizations
          </TabButton>
          <TabButton
            active={activeTab === "devices"}
            onClick={() => setActiveTab("devices")}
          >
            Devices
          </TabButton>
          <TabButton
            active={activeTab === "subscriptions"}
            onClick={() => setActiveTab("subscriptions")}
          >
            Subscriptions
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === "orgs" && <OrgsTab />}
        {activeTab === "devices" && <DevicesTab />}
        {activeTab === "subscriptions" && <SubscriptionsTab />}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: number;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[13px] font-medium text-ink-500">{label}</span>
      <span className="text-xl font-bold text-ink-900">
        {loading ? "..." : value}
      </span>
      {sub && <span className="text-[11px] text-ink-400">{sub}</span>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-2 py-2 text-[14px] font-medium transition ${
        active
          ? "border-brand-500 text-brand-600"
          : "border-transparent text-ink-500 hover:text-ink-700"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Organizations Tab
// ─────────────────────────────────────────────────────────────

function OrgsTab() {
  const { orgs, loading, error, createOrg, updateOrgStatus } = useAdminOrgs();
  const { locale } = useLocale();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<OrgCreate>({
    name: "",
    slug: "",
    planTier: "BASIC",
    contactEmail: "",
    contactPhone: "",
    address: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await createOrg(formData);
      setShowCreate(false);
      setFormData({
        name: "",
        slug: "",
        planTier: "BASIC",
        contactEmail: "",
        contactPhone: "",
        address: "",
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (org: OrgAdminView, newStatus: string) => {
    try {
      await updateOrgStatus(org.id, newStatus);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-[14px] text-ink-500">Loading...</div>;
  }

  if (error) {
    return <div className="py-10 text-center text-[14px] text-status-stopped">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Create Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-[14px] font-medium text-white hover:bg-brand-600"
        >
          {showCreate ? "Cancel" : "Create Organization"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-surface-300 bg-white p-4 shadow-sm"
        >
          <h3 className="mb-4 text-[14px] font-semibold text-ink-900">New Organization</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-700">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-700">Slug *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  })
                }
                className="w-full rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="org-slug"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-700">Plan Tier</label>
              <select
                value={formData.planTier}
                onChange={(e) => setFormData({ ...formData, planTier: e.target.value })}
                className="w-full rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-700">Contact Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-700">Contact Phone</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-700">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          {formError && (
            <p className="mt-3 text-[14px] text-status-stopped">{formError}</p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-brand-500 px-4 py-2 text-[14px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Orgs Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-300 bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-surface-200 bg-surface-50">
            <tr>
              <th className="px-4 py-2 font-medium text-ink-700">Name</th>
              <th className="px-4 py-2 font-medium text-ink-700">Slug</th>
              <th className="px-4 py-2 font-medium text-ink-700">Plan</th>
              <th className="px-4 py-2 font-medium text-ink-700">Status</th>
              <th className="px-4 py-2 font-medium text-ink-700">Devices</th>
              <th className="px-4 py-2 font-medium text-ink-700">Users</th>
              <th className="px-4 py-2 font-medium text-ink-700">Created</th>
              <th className="px-4 py-2 font-medium text-ink-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-500">
                  No organizations found
                </td>
              </tr>
            )}
            {orgs.map((org) => (
              <tr key={org.id} className="border-b border-surface-100 hover:bg-surface-50">
                <td className="px-4 py-2 font-medium text-ink-900">{org.name}</td>
                <td className="px-4 py-2 font-mono text-[13px] text-ink-600">{org.slug}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-[13px] font-medium text-brand-700">
                    {org.planTier}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={org.status} />
                </td>
                <td className="px-4 py-2 text-ink-700">{org.deviceCount}</td>
                <td className="px-4 py-2 text-ink-700">{org.userCount}</td>
                <td className="px-4 py-2 text-[13px] text-ink-500">
                  {formatRelative(org.createdAt, locale)}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={org.status}
                    onChange={(e) => handleStatusChange(org, e.target.value)}
                    className="rounded border border-surface-300 px-2 py-1 text-[13px]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-status-moving/15 text-status-moving",
    SUSPENDED: "bg-status-idle/15 text-status-idle",
    CANCELLED: "bg-status-stopped/15 text-status-stopped",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[13px] font-medium ${colors[status] ?? "bg-surface-200 text-ink-600"}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Devices Tab
// ─────────────────────────────────────────────────────────────

function DevicesTab() {
  const { orgs } = useAdminOrgs();
  const [orgFilter, setOrgFilter] = useState<string>("");
  const { devices, loading, error, reassignDevice } = useAdminDevices(orgFilter || undefined);
  const { locale } = useLocale();
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [selectedTargetOrg, setSelectedTargetOrg] = useState<Record<string, string>>({});

  const handleReassign = async (imei: string) => {
    const targetOrgId = selectedTargetOrg[imei];
    if (!targetOrgId) return;

    setReassigning(imei);
    try {
      await reassignDevice(imei, targetOrgId);
      setSelectedTargetOrg((prev) => {
        const next = { ...prev };
        delete next[imei];
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reassign device");
    } finally {
      setReassigning(null);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-[14px] text-ink-500">Loading...</div>;
  }

  if (error) {
    return <div className="py-10 text-center text-[14px] text-status-stopped">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-[14px] font-medium text-ink-700">Filter by Organization:</label>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Organizations</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Devices Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-300 bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-surface-200 bg-surface-50">
            <tr>
              <th className="px-4 py-2 font-medium text-ink-700">IMEI</th>
              <th className="px-4 py-2 font-medium text-ink-700">Name/Plate</th>
              <th className="px-4 py-2 font-medium text-ink-700">Organization</th>
              <th className="px-4 py-2 font-medium text-ink-700">Status</th>
              <th className="px-4 py-2 font-medium text-ink-700">Last Seen</th>
              <th className="px-4 py-2 font-medium text-ink-700">Reassign</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  No devices found
                </td>
              </tr>
            )}
            {devices.map((device) => (
              <tr key={device.imei} className="border-b border-surface-100 hover:bg-surface-50">
                <td className="px-4 py-2 font-mono text-[13px] text-ink-700">{device.imei}</td>
                <td className="px-4 py-2 text-ink-900">
                  {device.name || device.vehiclePlate || "—"}
                </td>
                <td className="px-4 py-2 text-ink-700">{device.orgName}</td>
                <td className="px-4 py-2">
                  <DeviceStatusBadge status={device.status} />
                </td>
                <td className="px-4 py-2 text-[13px] text-ink-500">
                  {device.lastSeenAt ? formatRelative(device.lastSeenAt, locale) : "Never"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTargetOrg[device.imei] ?? ""}
                      onChange={(e) =>
                        setSelectedTargetOrg((prev) => ({
                          ...prev,
                          [device.imei]: e.target.value,
                        }))
                      }
                      className="rounded border border-surface-300 px-2 py-1 text-[13px]"
                    >
                      <option value="">Select org...</option>
                      {orgs
                        .filter((o) => o.id !== device.orgId)
                        .map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleReassign(device.imei)}
                      disabled={
                        !selectedTargetOrg[device.imei] || reassigning === device.imei
                      }
                      className="rounded bg-brand-500 px-2 py-1 text-[13px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      {reassigning === device.imei ? "..." : "Move"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeviceStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ONLINE: "bg-status-moving/15 text-status-moving",
    OFFLINE: "bg-status-offline/15 text-status-offline",
    NEVER_CONNECTED: "bg-status-nodata/15 text-status-nodata",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[13px] font-medium ${colors[status] ?? "bg-surface-200 text-ink-600"}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Subscriptions Tab
// ─────────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const { orgs } = useAdminOrgs();
  const { stats, loading: statsLoading } = useAdminBillingStats();
  const {
    subscriptions,
    loading,
    error,
    search,
    extendSubscription,
    findExpired,
    findDueSoon,
    findDevicesWithoutSubscription,
    createSubscription,
  } = useAdminSubscriptions();

  const [imeiFilter, setImeiFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showExtendModal, setShowExtendModal] = useState<SubscriptionView | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [extendDate, setExtendDate] = useState("");
  const [extending, setExtending] = useState(false);

  // Devices without subscription state
  const [devicesWithoutSub, setDevicesWithoutSub] = useState<DeviceWithoutSub[]>([]);
  const [devicesWithoutSubTotal, setDevicesWithoutSubTotal] = useState(0);
  const [loadingNoSub, setLoadingNoSub] = useState(false);
  const [showNoSubDevices, setShowNoSubDevices] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState<DeviceWithoutSub | null>(null);
  const [createDays, setCreateDays] = useState("30");
  const [createPlan, setCreatePlan] = useState("BASIC");
  const [creating, setCreating] = useState(false);

  const handleSearch = () => {
    search({
      imei: imeiFilter || undefined,
      orgId: orgFilter || undefined,
      status: statusFilter || undefined,
      limit: 100,
    });
  };

  const handleExtend = async () => {
    if (!showExtendModal) return;

    setExtending(true);
    try {
      const request: ExtendRequest = {};
      if (extendDate) {
        request.newDueAt = extendDate;
      } else if (extendDays) {
        request.additionalDays = parseInt(extendDays, 10);
      }
      await extendSubscription(showExtendModal.id, request);
      setShowExtendModal(null);
      setExtendDays("30");
      setExtendDate("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to extend subscription");
    } finally {
      setExtending(false);
    }
  };

  const handleLoadDevicesWithoutSub = async () => {
    setLoadingNoSub(true);
    try {
      const result = await findDevicesWithoutSubscription(100);
      setDevicesWithoutSub(result.devices);
      setDevicesWithoutSubTotal(result.total);
      setShowNoSubDevices(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoadingNoSub(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!showCreateModal) return;

    setCreating(true);
    try {
      const request: CreateSubscriptionRequest = {
        imei: showCreateModal.imei,
        orgId: showCreateModal.orgId,
        planTier: createPlan,
        days: parseInt(createDays, 10),
      };
      await createSubscription(request);
      setShowCreateModal(null);
      setCreateDays("30");
      setCreatePlan("BASIC");
      // Refresh the devices without subscription list
      const result = await findDevicesWithoutSubscription(100);
      setDevicesWithoutSub(result.devices);
      setDevicesWithoutSubTotal(result.total);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create subscription");
    } finally {
      setCreating(false);
    }
  };

  const getOrgName = (orgId: string) =>
    orgs.find((o) => o.id === orgId)?.name ?? "Unknown";

  if (loading) {
    return <div className="py-10 text-center text-[14px] text-ink-500">Loading...</div>;
  }

  if (error) {
    return <div className="py-10 text-center text-[14px] text-status-stopped">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Billing Stats */}
      <div className="rounded-lg border border-surface-300 bg-white p-4">
        <h3 className="mb-3 text-[14px] font-semibold text-ink-900">Billing Stats</h3>
        <div className="flex flex-wrap gap-6">
          <StatCard label="Total" value={stats?.total ?? 0} loading={statsLoading} />
          <StatCard
            label="Active"
            value={stats?.active ?? 0}
            loading={statsLoading}
          />
          <StatCard
            label="Grace"
            value={stats?.grace ?? 0}
            loading={statsLoading}
          />
          <StatCard
            label="Suspended"
            value={stats?.suspended ?? 0}
            loading={statsLoading}
          />
          <StatCard
            label="Expiring 7d"
            value={stats?.expiringIn7Days ?? 0}
            loading={statsLoading}
          />
          <StatCard
            label="Expired Unpaid"
            value={stats?.expiredUnpaid ?? 0}
            loading={statsLoading}
          />
        </div>
      </div>

      {/* Search Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-surface-300 bg-white p-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink-700">
            Search IMEI
          </label>
          <input
            type="text"
            value={imeiFilter}
            onChange={(e) => setImeiFilter(e.target.value)}
            placeholder="IMEI prefix..."
            className="rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink-700">
            Organization
          </label>
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none"
          >
            <option value="">All</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink-700">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-surface-300 px-3 py-1.5 text-[14px] focus:border-brand-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="GRACE">Grace</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-lg bg-brand-500 px-4 py-1.5 text-[14px] font-medium text-white hover:bg-brand-600"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => findExpired()}
          className="rounded-lg border border-surface-300 px-4 py-1.5 text-[14px] font-medium text-ink-700 hover:bg-surface-50"
        >
          Show Expired
        </button>
        <button
          type="button"
          onClick={() => findDueSoon(7)}
          className="rounded-lg border border-surface-300 px-4 py-1.5 text-[14px] font-medium text-ink-700 hover:bg-surface-50"
        >
          Due Soon
        </button>
        <button
          type="button"
          onClick={handleLoadDevicesWithoutSub}
          disabled={loadingNoSub}
          className="rounded-lg border border-status-stopped px-4 py-1.5 text-[14px] font-medium text-status-stopped hover:bg-status-stopped/10"
        >
          {loadingNoSub ? "Loading..." : "Devices Without Subscription"}
        </button>
      </div>

      {/* Devices Without Subscription */}
      {showNoSubDevices && (
        <div className="rounded-lg border border-status-stopped/30 bg-status-stopped/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-ink-900">
              Devices Without Subscription ({devicesWithoutSubTotal})
            </h3>
            <button
              type="button"
              onClick={() => setShowNoSubDevices(false)}
              className="text-[13px] text-ink-500 hover:text-ink-700"
            >
              Hide
            </button>
          </div>
          {devicesWithoutSub.length === 0 ? (
            <p className="text-[14px] text-ink-500">All devices have subscriptions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="border-b border-surface-200 bg-surface-50">
                  <tr>
                    <th className="px-3 py-2 font-medium text-ink-700">IMEI</th>
                    <th className="px-3 py-2 font-medium text-ink-700">Device Name</th>
                    <th className="px-3 py-2 font-medium text-ink-700">Organization</th>
                    <th className="px-3 py-2 font-medium text-ink-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devicesWithoutSub.map((d) => (
                    <tr key={d.imei} className="border-b border-surface-100">
                      <td className="px-3 py-2 font-mono text-[13px] text-ink-700">{d.imei}</td>
                      <td className="px-3 py-2 text-ink-700">{d.deviceName || "—"}</td>
                      <td className="px-3 py-2 text-ink-700">{d.orgName}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateModal(d)}
                          className="rounded bg-brand-500 px-2 py-1 text-[13px] font-medium text-white hover:bg-brand-600"
                        >
                          Create Subscription
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-300 bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-surface-200 bg-surface-50">
            <tr>
              <th className="px-4 py-2 font-medium text-ink-700">Device IMEI</th>
              <th className="px-4 py-2 font-medium text-ink-700">Organization</th>
              <th className="px-4 py-2 font-medium text-ink-700">Plan</th>
              <th className="px-4 py-2 font-medium text-ink-700">Status</th>
              <th className="px-4 py-2 font-medium text-ink-700">Expires</th>
              <th className="px-4 py-2 font-medium text-ink-700">Days Left</th>
              <th className="px-4 py-2 font-medium text-ink-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  No subscriptions found
                </td>
              </tr>
            )}
            {subscriptions.map((sub) => (
              <tr
                key={sub.id}
                className={`border-b border-surface-100 hover:bg-surface-50 ${
                  sub.isExpired ? "bg-status-stopped/5" : ""
                }`}
              >
                <td className="px-4 py-2 font-mono text-[13px] text-ink-700">
                  {sub.deviceImei}
                </td>
                <td className="px-4 py-2 text-ink-700">
                  {getOrgName(sub.orgId)}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-[13px] font-medium text-brand-700">
                    {sub.planTier}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <SubscriptionStatusBadge status={sub.effectiveStatus} />
                </td>
                <td className="px-4 py-2 text-[13px] text-ink-500">
                  {formatDate(sub.nextDueAt)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-[13px] font-medium ${
                      sub.isExpired
                        ? "text-status-stopped"
                        : sub.daysUntilDue <= 7
                        ? "text-status-idle"
                        : "text-ink-700"
                    }`}
                  >
                    {sub.isExpired ? "Expired" : sub.daysUntilDue}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setShowExtendModal(sub)}
                    className="rounded bg-brand-500 px-2 py-1 text-[13px] font-medium text-white hover:bg-brand-600"
                  >
                    Extend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-ink-900">
              Extend Subscription
            </h3>
            <p className="mb-4 text-[14px] text-ink-600">
              Device: <span className="font-mono">{showExtendModal.deviceImei}</span>
            </p>
            <p className="mb-4 text-[14px] text-ink-600">
              Current expiry: {formatDate(showExtendModal.nextDueAt)}
            </p>

            <div className="mb-4 space-y-4">
              <div>
                <label className="mb-1 block text-[14px] font-medium text-ink-700">
                  Add days
                </label>
                <input
                  type="number"
                  min="1"
                  value={extendDays}
                  onChange={(e) => {
                    setExtendDays(e.target.value);
                    setExtendDate("");
                  }}
                  className="w-full rounded-md border border-surface-300 px-3 py-2 text-[14px] focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="text-center text-[13px] text-ink-400">— or —</div>
              <div>
                <label className="mb-1 block text-[14px] font-medium text-ink-700">
                  Set specific date
                </label>
                <input
                  type="date"
                  value={extendDate}
                  onChange={(e) => {
                    setExtendDate(e.target.value);
                    setExtendDays("");
                  }}
                  className="w-full rounded-md border border-surface-300 px-3 py-2 text-[14px] focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExtendModal(null)}
                className="rounded-lg border border-surface-300 px-4 py-2 text-[14px] font-medium text-ink-700 hover:bg-surface-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtend}
                disabled={extending || (!extendDays && !extendDate)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-[14px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {extending ? "Extending..." : "Extend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-ink-900">
              Create Subscription
            </h3>
            <p className="mb-2 text-[14px] text-ink-600">
              Device: <span className="font-mono">{showCreateModal.imei}</span>
            </p>
            <p className="mb-4 text-[14px] text-ink-600">
              Organization: {showCreateModal.orgName}
            </p>

            <div className="mb-4 space-y-4">
              <div>
                <label className="mb-1 block text-[14px] font-medium text-ink-700">
                  Plan Tier
                </label>
                <select
                  value={createPlan}
                  onChange={(e) => setCreatePlan(e.target.value)}
                  className="w-full rounded-md border border-surface-300 px-3 py-2 text-[14px] focus:border-brand-500 focus:outline-none"
                >
                  <option value="TRIAL">Trial</option>
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[14px] font-medium text-ink-700">
                  Duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={createDays}
                  onChange={(e) => setCreateDays(e.target.value)}
                  className="w-full rounded-md border border-surface-300 px-3 py-2 text-[14px] focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(null)}
                className="rounded-lg border border-surface-300 px-4 py-2 text-[14px] font-medium text-ink-700 hover:bg-surface-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSubscription}
                disabled={creating || !createDays}
                className="rounded-lg bg-brand-500 px-4 py-2 text-[14px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-status-moving/15 text-status-moving",
    GRACE: "bg-status-idle/15 text-status-idle",
    SUSPENDED: "bg-status-stopped/15 text-status-stopped",
    CANCELLED: "bg-status-nodata/15 text-status-nodata",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-[13px] font-medium ${
        colors[status] ?? "bg-surface-200 text-ink-600"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
