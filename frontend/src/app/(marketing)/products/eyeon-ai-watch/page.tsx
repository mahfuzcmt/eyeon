import { WatchProductPage } from "@/components/landing/pages/WatchProductPage";

export const metadata = {
  title: "EyeOn AI Watch",
  description:
    "A watch for your child: live location, alerts when they leave or reach home, school and coaching, a set route, emergency calls and two-way calls. Call for price.",
  // The poster is what a shared link shows (Facebook, WhatsApp).
  openGraph: {
    title: "EyeOn AI Watch",
    description: "আপনার প্রিয়জনের সুরক্ষায়, বিশ্বস্ত এক প্রহরী. Live location, safe zones, SOS and calls.",
    images: [{ url: "/images/eyeon-ai-watch-poster.jpg", width: 1254, height: 1254, alt: "EyeOn AI Watch" }],
  },
};

export default function EyeOnAiWatch() {
  return <WatchProductPage />;
}
