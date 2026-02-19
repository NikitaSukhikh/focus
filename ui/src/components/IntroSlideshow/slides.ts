import { Slide } from './types';
import filesSupportedImage from '/logos/files_supported_example.png';
import arrowsImage from '/logos/Arrows_example.png';
import textnoteImage from '/logos/textnote_example.png';
import shareSpaceImage from '/logos/share_link_example.png';
import previewImage from '/logos/preview_example.png';
import externalFileImage from '/logos/external_file_example.png';

export const SLIDES: Slide[] = [
  {
    title: 'introSlideshow.slide0.title',
    description: 'introSlideshow.slide0.description',
    descriptionAlign: 'left',
  },
  {
    title: 'introSlideshow.slide1.title',
    description: 'introSlideshow.slide1.description',
    image: filesSupportedImage,
  },
  {
    title: 'introSlideshow.slide2.title',
    description: 'introSlideshow.slide2.description',
    image: arrowsImage,
  },
  {
    title: 'introSlideshow.slide3.title',
    description: 'introSlideshow.slide3.description',
    image: textnoteImage,
  },
  {
    title: 'introSlideshow.slide4.title',
    description: 'introSlideshow.slide4.description',
    image: shareSpaceImage,
  },
  {
    title: 'introSlideshow.slide5.title',
    description: 'introSlideshow.slide5.description',
    image: previewImage,
  },
  {
    title: 'introSlideshow.slide6.title',
    description: 'introSlideshow.slide6.description',
    image: externalFileImage,
  },
  {
    title: 'introSlideshow.slide7.title',
    description: 'introSlideshow.slide7.description',
  },
];
