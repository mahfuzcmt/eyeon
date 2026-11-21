import { redirect } from "next/navigation";

/** eyeoniot.com/download, an address people may guess, leads to the same page as the QR code. */
export default function DownloadPage() {
  redirect("/app");
}
