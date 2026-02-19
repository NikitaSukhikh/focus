import { Slide } from './types';
import filesSupportedImage from '/logos/files_supported_example.png';
import arrowsImage from '/logos/Arrows_example.png';
import textnoteImage from '/logos/textnote_example.png';
import shareSpaceImage from '/logos/share_link_example.png';
import previewImage from '/logos/preview_example.png';
import externalBrowserImage from '/logos/external_browser_example.png';

export const SLIDES: Slide[] = [
  {
    title: 'Welcome to Focus',
    description:
      'Your workspace for organizing web links, articles, quick notes, files and documents — all in one place',
  },
  {
    title: '385 file types supported',
    description:
      'Documents, audio, video, images, PDF, ebooks, presentations, spreadsheets and many more. Drop, open and preview directly in Focus',
    image: filesSupportedImage,
  },
  {
    title: 'Connect everything visually',
    description:
      'Draw arrows between any objects to create visual graphs. See how your ideas, links and files relate to each other.',
    image: arrowsImage,
  },
  {
    title: 'Quick notes',
    description:
      "Add text notes anywhere on the center pane. Notes are automatically saved and synced across all your devices.",
    image: textnoteImage,
  },
  {
    title: 'Share in one click',
    description:
      "Share any object or entire space instantly via all popular platforms. Your audience doesn't need Focus to view shared content.",
    image: shareSpaceImage,
  },
  {
    title: 'Single click for quick preview',
    description:
      '',
    image: previewImage,
  },
  {
    title: 'Double click for open in your favorite app or browser',
    description:
      '',
    image: externalBrowserImage,
  },
  
  {
    title: 'Ready to go',
    description:
      'Press the + button or use Ctrl+I (Windows) to add your first item. Drag files straight onto the canvas to get started.',
  },
];
