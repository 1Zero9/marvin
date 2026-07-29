export type IconName =
  | "search"
  | "sparkle"
  | "camera"
  | "lock"
  | "weight"
  | "alcohol"
  | "workouts"
  | "checklist"
  | "rating";

const paths: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <line x1="21" y1="21" x2="15.5" y2="15.5" />
    </>
  ),
  sparkle: (
    <path
      d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6-5.6-1.9 5.6-1.9L12 2.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  camera: (
    <>
      <path d="M8.5 7 10 4.5h4L15.5 7H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  weight: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <rect x="9" y="8.2" width="6" height="3" rx="1" />
      <line x1="7" y1="16.2" x2="17" y2="16.2" />
    </>
  ),
  alcohol: (
    <>
      <path d="M9 3h6l-1.1 8.4a2 2 0 0 1-4 0L9 3Z" />
      <line x1="12" y1="13.2" x2="12" y2="19.5" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </>
  ),
  workouts: (
    <>
      <rect x="1.5" y="10" width="3" height="4" rx="1" />
      <rect x="19.5" y="10" width="3" height="4" rx="1" />
      <rect x="4.5" y="8" width="3" height="8" rx="1" />
      <rect x="16.5" y="8" width="3" height="8" rx="1" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" />
    </>
  ),
  checklist: (
    <>
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <rect x="5" y="5" width="14" height="15.5" rx="2" />
      <path d="m9 13 2 2 4-4" />
    </>
  ),
  rating: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.2" r="1" fill="currentColor" stroke="none" />
      <path d="M8 15c1.4 1.4 6.6 1.4 8 0" />
    </>
  ),
};

export default function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
