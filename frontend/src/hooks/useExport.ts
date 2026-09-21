import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export type ExportType = "trips" | "alarms" | "alarm-overview" | "monthly-summary" | "devices" | "locations";

interface ExportParams {
  type: ExportType;
  from?: string;
  to?: string;
  device?: string;
  month?: string;
}

interface UseExportReturn {
  loading: boolean;
  error: string | null;
  exportData: (params: ExportParams) => Promise<void>;
}

export function useExport(): UseExportReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(async (params: ExportParams) => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = "";
      const queryParams = new URLSearchParams();

      switch (params.type) {
        case "trips":
          endpoint = "/exports/trips.xlsx";
          if (params.from) queryParams.set("from", params.from);
          if (params.to) queryParams.set("to", params.to);
          break;
        case "alarms":
          endpoint = "/exports/alarms.xlsx";
          if (params.from) queryParams.set("from", params.from);
          if (params.to) queryParams.set("to", params.to);
          break;
        case "alarm-overview":
          endpoint = "/exports/alarm-overview.xlsx";
          if (params.from) queryParams.set("from", params.from);
          if (params.to) queryParams.set("to", params.to);
          break;
        case "monthly-summary":
          endpoint = "/exports/monthly-summary.xlsx";
          if (params.device) queryParams.set("device", params.device);
          if (params.month) queryParams.set("month", params.month);
          break;
        case "devices":
          endpoint = "/exports/devices.xlsx";
          break;
        case "locations":
          endpoint = "/exports/locations.xlsx";
          if (params.device) queryParams.set("device", params.device);
          if (params.from) queryParams.set("from", params.from);
          if (params.to) queryParams.set("to", params.to);
          break;
      }

      const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

      const response = await api.get(url, {
        responseType: "blob",
      });

      // Extract filename from Content-Disposition header or generate one
      const contentDisposition = response.headers["content-disposition"];
      let filename = `export_${params.type}_${new Date().toISOString().split("T")[0]}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create download link
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    exportData,
  };
}
