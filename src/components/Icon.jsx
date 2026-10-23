// Small line icons drawn for this app: 24×24, stroked in the current text colour.
// Always decorative (aria-hidden); the text next to them carries the meaning.
const PATHS = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  brief: "M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5",
  calendar: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M9 3v4M15 3v4",
  chat: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9l-5 4v-4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  phone: "M6 3h3l2 5-2 1.5a10 10 0 0 0 5.5 5.5L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z",
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
