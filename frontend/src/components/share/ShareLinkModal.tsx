"use client";

import { useState, useEffect } from "react";
import { useShareLinks } from "@/hooks/useShareLinks";
import { useLocale } from "@/lib/i18n";
import type { ShareLinkView, CreateShareLinkRequest } from "@/types/domain";

interface ShareLinkModalProps {
  deviceImei: string;
  deviceName: string;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { value: 1, label: { en: "1 hour", bn: "১ ঘন্টা" } },
  { value: 6, label: { en: "6 hours", bn: "৬ ঘন্টা" } },
  { value: 24, label: { en: "24 hours", bn: "২৪ ঘন্টা" } },
  { value: 72, label: { en: "3 days", bn: "৩ দিন" } },
  { value: 168, label: { en: "7 days", bn: "৭ দিন" } },
  { value: 720, label: { en: "30 days", bn: "৩০ দিন" } },
];

export function ShareLinkModal({ deviceImei, deviceName, onClose }: ShareLinkModalProps) {
  const { locale: lang } = useLocale();
  const { links, loading, fetchLinks, createLink, revokeLink } = useShareLinks();
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [showHistory, setShowHistory] = useState(false);
  const [allowRealtime, setAllowRealtime] = useState(true);

  useEffect(() => {
    fetchLinks(deviceImei);
  }, [deviceImei, fetchLinks]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const request: CreateShareLinkRequest = {
        deviceImei,
        label: label || undefined,
        expiresInHours,
        showHistory,
        allowRealtime,
      };
      await createLink(request);
      setShowCreateForm(false);
      setLabel("");
      setExpiresInHours(24);
      setShowHistory(false);
      setAllowRealtime(true);
    } catch (err) {
      console.error("Failed to create share link:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (!confirm(lang === "bn" ? "এই লিংক বাতিল করতে চান?" : "Revoke this share link?")) {
      return;
    }
    try {
      await revokeLink(linkId);
    } catch (err) {
      console.error("Failed to revoke link:", err);
    }
  };

  const handleCopy = (link: ShareLinkView) => {
    navigator.clipboard.writeText(link.shareUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs < 0) {
      return lang === "bn" ? "মেয়াদ উত্তীর্ণ" : "Expired";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return lang === "bn" ? `${diffDays} দিন বাকি` : `${diffDays} days left`;
    }
    return lang === "bn" ? `${diffHours} ঘন্টা বাকি` : `${diffHours} hours left`;
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-ink-950/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-surface-300 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              {lang === "bn" ? "লোকেশন শেয়ার করুন" : "Share Location"}
            </h2>
            <p className="text-[14px] text-ink-400">{deviceName || deviceImei}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Existing links */}
          {loading ? (
            <div className="text-center py-8 text-ink-400">
              {lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}
            </div>
          ) : links.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-[14px] font-medium text-ink-600">
                {lang === "bn" ? "সক্রিয় লিংক" : "Active Links"} ({links.length})
              </h3>
              {links.map(link => (
                <div
                  key={link.id}
                  className="bg-surface-100 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-ink-900">
                        {link.label || (lang === "bn" ? "শেয়ার লিংক" : "Share Link")}
                      </p>
                      <p className="text-[13px] text-ink-400">
                        {formatExpiry(link.expiresAt)} &middot; {link.accessCount} {lang === "bn" ? "বার দেখা হয়েছে" : "views"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {link.showHistory && (
                        <span className="text-[13px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded">
                          {lang === "bn" ? "ইতিহাস" : "History"}
                        </span>
                      )}
                      {link.allowRealtime && (
                        <span className="text-[13px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                          {lang === "bn" ? "রিয়েলটাইম" : "Realtime"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={link.shareUrl}
                      className="flex-1 bg-white text-[13px] text-ink-600 px-2 py-1.5 rounded border border-surface-300"
                    />
                    <button
                      onClick={() => handleCopy(link)}
                      className="px-3 py-1.5 text-[13px] bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
                    >
                      {copiedId === link.id
                        ? (lang === "bn" ? "কপি হয়েছে!" : "Copied!")
                        : (lang === "bn" ? "কপি" : "Copy")}
                    </button>
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="px-3 py-1.5 text-[13px] bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors"
                    >
                      {lang === "bn" ? "বাতিল" : "Revoke"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showCreateForm ? (
            <div className="text-center py-8 text-ink-400">
              <p>{lang === "bn" ? "কোনো সক্রিয় শেয়ার লিংক নেই" : "No active share links"}</p>
            </div>
          ) : null}

          {/* Create form */}
          {showCreateForm ? (
            <div className="bg-surface-100 rounded-lg p-4 space-y-4">
              <h3 className="text-[14px] font-medium text-ink-900">
                {lang === "bn" ? "নতুন লিংক তৈরি করুন" : "Create New Link"}
              </h3>

              <div>
                <label className="block text-[13px] text-ink-400 mb-1">
                  {lang === "bn" ? "লেবেল (ঐচ্ছিক)" : "Label (optional)"}
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={lang === "bn" ? "যেমন: পরিবারের জন্য" : "e.g., For family"}
                  className="w-full bg-white text-ink-900 text-[14px] px-3 py-2 rounded border border-surface-300 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] text-ink-400 mb-1">
                  {lang === "bn" ? "মেয়াদ" : "Expires in"}
                </label>
                <select
                  value={expiresInHours}
                  onChange={e => setExpiresInHours(Number(e.target.value))}
                  className="w-full bg-white text-ink-900 text-[14px] px-3 py-2 rounded border border-surface-300 focus:border-brand-500 focus:outline-none"
                >
                  {EXPIRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {lang === "bn" ? opt.label.bn : opt.label.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRealtime}
                    onChange={e => setAllowRealtime(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-300 bg-white text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-[14px] text-ink-700">
                    {lang === "bn" ? "রিয়েলটাইম আপডেট দেখান" : "Show realtime updates"}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHistory}
                    onChange={e => setShowHistory(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-300 bg-white text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-[14px] text-ink-700">
                    {lang === "bn" ? "২৪ ঘন্টার ইতিহাস দেখান" : "Show 24h route history"}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 text-[14px] border border-surface-300 bg-white text-ink-700 rounded hover:bg-surface-100 transition-colors"
                >
                  {lang === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 px-4 py-2 text-[14px] bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {creating
                    ? (lang === "bn" ? "তৈরি হচ্ছে..." : "Creating...")
                    : (lang === "bn" ? "লিংক তৈরি করুন" : "Create Link")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full px-4 py-3 text-[14px] bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {lang === "bn" ? "নতুন শেয়ার লিংক তৈরি করুন" : "Create New Share Link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
