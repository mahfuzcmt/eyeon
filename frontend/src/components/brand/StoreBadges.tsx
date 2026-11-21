/**
 * Google Play and App Store badges, drawn the way the stores' guidelines show them: black, a
 * thin grey edge, the store's mark, the wording in English. Used on eyeoniot.com/app and in the
 * site footer. When the apps are published, the stores' official badge files can replace these.
 */

export function StoreBadgeArt({ store, dim = false, small = false }: { store: "play" | "apple"; dim?: boolean; small?: boolean }) {
  const play = store === "play";
  return (
    <span
      className={`inline-flex items-center rounded-[10px] border border-[#A6A6A6] bg-black text-white ${
        small ? "h-[44px] w-[150px] gap-2 px-3" : "h-[60px] w-[200px] gap-3 px-4"
      } ${dim ? "opacity-45" : ""}`}
    >
      {play ? <GooglePlayMark small={small} /> : <AppleMark small={small} />}
      <span className="flex flex-col items-start leading-none">
        <span className={`${small ? "text-[9px]" : play ? "text-[11px]" : "text-[12px]"} font-medium ${play ? "uppercase tracking-wide" : ""}`}>
          {play ? "Get it on" : "Download on the"}
        </span>
        <span
          className={`${small ? "mt-0.5 text-[16px]" : "mt-1 text-[22px]"} font-semibold tracking-tight`}
          style={{ fontFamily: play ? "'Product Sans', Roboto, Arial, sans-serif" : "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}
        >
          {play ? "Google Play" : "App Store"}
        </span>
      </span>
    </span>
  );
}

/** The four-colour Google Play triangle. */
export function GooglePlayMark({ small = false }: { small?: boolean }) {
  return (
    <svg width={small ? 22 : 30} height={small ? 24 : 33} viewBox="0 0 30 33" aria-hidden="true" className="shrink-0">
      <path d="M1.3 1.1C.9 1.5.7 2.2.7 3v27c0 .8.2 1.5.6 1.9l.1.1L16.5 16.9v-.4L1.4 1l-.1.1Z" fill="#4285F4" />
      <path d="m21.5 22-5-5v-.4l5-5 .1.1 6 3.4c1.7 1 1.7 2.6 0 3.6l-6 3.4-.1-.1Z" fill="#FBBC04" />
      <path d="m21.6 21.9-5.1-5.2L1.3 31.9c.6.6 1.5.7 2.6.1l17.7-10.1" fill="#EA4335" />
      <path d="M21.6 11.5 3.9 1.4C2.8.8 1.9.9 1.3 1.5l15.2 15.2 5.1-5.2Z" fill="#34A853" />
    </svg>
  );
}

/** The Apple logo. */
export function AppleMark({ small = false }: { small?: boolean }) {
  return (
    <svg width={small ? 20 : 28} height={small ? 24 : 33} viewBox="0 0 384 470" aria-hidden="true" className="shrink-0" fill="#fff">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9Zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3Z" />
    </svg>
  );
}
