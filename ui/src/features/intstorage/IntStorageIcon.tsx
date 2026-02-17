interface IntStorageIconProps {
  size?: number;
}

export function IntStorageIcon({ size = 16 }: IntStorageIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 104c0-17.673 14.327-32 32-32h256l96 96v240c0 17.673-14.327 32-32 32H64c-17.673 0-32-14.327-32-32V104Z"
        fill="#F6C343"
      />
      <path
        d="M320 72 416 168h-96c-17.673 0-32-14.327-32-32V72Z"
        fill="#E8B73A"
      />
      <path
        d="M80 208c0-8.837 7.163-16 16-16h320c8.837 0 16 7.163 16 16v192c0 17.673-14.327 32-32 32H112c-17.673 0-32-14.327-32-32V208Z"
        fill="#FBD45A"
      />
    </svg>
  );
}
