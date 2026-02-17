/**
 * Reusable share platform button strip to keep platform presentation consistent across dialogs.
 */
import { SharePlatform } from '@/components/dialogs/share/sharePlatforms';
interface SharePlatformButtonsProps {
  platforms: SharePlatform[];
  onPlatformClick: (_platform: SharePlatform) => void;
}

export function SharePlatformButtons({ platforms, onPlatformClick }: SharePlatformButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {platforms.map((platform) => {
        const IconComponent = platform.icon;
        return (
          <button
            key={platform.name}
            onClick={() => onPlatformClick(platform)}
            title={platform.name}
            className={`p-2.5 rounded-lg border border-slate-200 transition-all hover:scale-110 hover:shadow-md ${platform.hoverClassName}`}
          >
            <IconComponent size={26} />
          </button>
        );
      })}
    </div>
  );
}
