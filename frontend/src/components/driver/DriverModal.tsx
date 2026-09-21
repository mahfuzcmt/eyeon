"use client";

import { useState, useEffect } from "react";
import type { DriverView, DriverCreate, DriverUpdate, DriverStatus } from "@/types/domain";

interface DriverModalProps {
  driver?: DriverView;
  onSave: (data: DriverCreate | DriverUpdate) => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: DriverStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

const LICENSE_TYPES = ["Light", "Medium", "Heavy", "Professional", "Commercial", "Motorcycle"];

export function DriverModal({ driver, onSave, onClose }: DriverModalProps) {
  const isEdit = !!driver;

  const [formData, setFormData] = useState({
    name: driver?.name ?? "",
    phone: driver?.phone ?? "",
    email: driver?.email ?? "",
    licenseNo: driver?.licenseNo ?? "",
    licenseType: driver?.licenseType ?? "",
    licenseExpiry: driver?.licenseExpiry ?? "",
    nid: driver?.nid ?? "",
    photoUrl: driver?.photoUrl ?? "",
    rfidCard: driver?.rfidCard ?? "",
    emergencyContact: driver?.emergencyContact ?? "",
    emergencyPhone: driver?.emergencyPhone ?? "",
    address: driver?.address ?? "",
    dateOfBirth: driver?.dateOfBirth ?? "",
    hireDate: driver?.hireDate ?? "",
    status: driver?.status ?? "ACTIVE",
    notes: driver?.notes ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus first input on mount
  useEffect(() => {
    const input = document.getElementById("driver-name");
    input?.focus();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Driver name is required");
      return;
    }

    setSaving(true);
    try {
      // Build payload, omitting empty strings
      const payload: DriverCreate | DriverUpdate = {
        name: formData.name.trim(),
      };

      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.licenseNo.trim()) payload.licenseNo = formData.licenseNo.trim();
      if (formData.licenseType) payload.licenseType = formData.licenseType;
      if (formData.licenseExpiry) payload.licenseExpiry = formData.licenseExpiry;
      if (formData.nid.trim()) payload.nid = formData.nid.trim();
      if (formData.photoUrl.trim()) payload.photoUrl = formData.photoUrl.trim();
      if (formData.rfidCard.trim()) payload.rfidCard = formData.rfidCard.trim();
      if (formData.emergencyContact.trim()) payload.emergencyContact = formData.emergencyContact.trim();
      if (formData.emergencyPhone.trim()) payload.emergencyPhone = formData.emergencyPhone.trim();
      if (formData.address.trim()) payload.address = formData.address.trim();
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
      if (formData.hireDate) payload.hireDate = formData.hireDate;
      if (formData.notes.trim()) payload.notes = formData.notes.trim();
      if (isEdit && formData.status) (payload as DriverUpdate).status = formData.status as DriverStatus;

      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save driver");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-ink-900">
            {isEdit ? "Edit Driver" : "Add New Driver"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-[14px] text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Info Section */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-ink-500">Basic Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="driver-name" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="driver-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Enter driver's full name"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="driver@example.com"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="dateOfBirth" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Date of Birth
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* NID */}
                <div>
                  <label htmlFor="nid" className="mb-1 block text-[14px] font-medium text-ink-700">
                    National ID (NID)
                  </label>
                  <input
                    id="nid"
                    name="nid"
                    type="text"
                    value={formData.nid}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Enter NID number"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Address
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Enter address"
                  />
                </div>
              </div>
            </div>

            {/* License Info Section */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-ink-500">License Information</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {/* License Number */}
                <div>
                  <label htmlFor="licenseNo" className="mb-1 block text-[14px] font-medium text-ink-700">
                    License Number
                  </label>
                  <input
                    id="licenseNo"
                    name="licenseNo"
                    type="text"
                    value={formData.licenseNo}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="DL-XXXXXXXX"
                  />
                </div>

                {/* License Type */}
                <div>
                  <label htmlFor="licenseType" className="mb-1 block text-[14px] font-medium text-ink-700">
                    License Type
                  </label>
                  <select
                    id="licenseType"
                    name="licenseType"
                    value={formData.licenseType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Select type</option>
                    {LICENSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* License Expiry */}
                <div>
                  <label htmlFor="licenseExpiry" className="mb-1 block text-[14px] font-medium text-ink-700">
                    License Expiry
                  </label>
                  <input
                    id="licenseExpiry"
                    name="licenseExpiry"
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Employment Section */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-ink-500">Employment Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Hire Date */}
                <div>
                  <label htmlFor="hireDate" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Hire Date
                  </label>
                  <input
                    id="hireDate"
                    name="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* Status (edit only) */}
                {isEdit && (
                  <div>
                    <label htmlFor="status" className="mb-1 block text-[14px] font-medium text-ink-700">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* RFID Card */}
                <div>
                  <label htmlFor="rfidCard" className="mb-1 block text-[14px] font-medium text-ink-700">
                    RFID Card Number
                  </label>
                  <input
                    id="rfidCard"
                    name="rfidCard"
                    type="text"
                    value={formData.rfidCard}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="RFID card ID for driver identification"
                  />
                </div>

                {/* Photo URL */}
                <div>
                  <label htmlFor="photoUrl" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Photo URL
                  </label>
                  <input
                    id="photoUrl"
                    name="photoUrl"
                    type="url"
                    value={formData.photoUrl}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-ink-500">Emergency Contact</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Emergency Contact Name */}
                <div>
                  <label htmlFor="emergencyContact" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Contact Name
                  </label>
                  <input
                    id="emergencyContact"
                    name="emergencyContact"
                    type="text"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Emergency contact name"
                  />
                </div>

                {/* Emergency Phone */}
                <div>
                  <label htmlFor="emergencyPhone" className="mb-1 block text-[14px] font-medium text-ink-700">
                    Contact Phone
                  </label>
                  <input
                    id="emergencyPhone"
                    name="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="mb-1 block text-[14px] font-medium text-ink-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Additional notes about the driver..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-ink-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ink-200 px-4 py-2 text-[14px] font-medium text-ink-600 hover:bg-ink-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="rounded-lg bg-brand-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : isEdit ? (
              "Update Driver"
            ) : (
              "Add Driver"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
