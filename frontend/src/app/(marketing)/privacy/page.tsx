import { PrivacyPage } from "@/components/landing/pages/LegalPages";

/** https://eyeoniot.com/privacy - the privacy policy URL given to Google Play. Do not move it. */
export const metadata = {
  title: "Privacy policy — EyeOn",
  description: "What information the EyeOn app and the EyeOn AI Watch handle, why, who can see it, and how to have it deleted.",
};

export default function Privacy() {
  return <PrivacyPage />;
}
