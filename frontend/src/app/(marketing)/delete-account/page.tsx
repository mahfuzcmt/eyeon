import { DeleteAccountPage } from "@/components/landing/pages/LegalPages";

/** https://eyeoniot.com/delete-account - the account deletion URL given to Google Play. Do not move it. */
export const metadata = {
  title: "Delete your EyeOn account",
  description: "How to ask for your EyeOn account, or one person's data, to be deleted, and what is deleted.",
};

export default function DeleteAccount() {
  return <DeleteAccountPage />;
}
