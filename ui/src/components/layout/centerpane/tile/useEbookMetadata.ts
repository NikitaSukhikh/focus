import { useEffect, useState } from 'react';
import { detectFileType } from '../../../../utils/fileTypes';

interface EbookMetadata {
  title: string;
  author: string | null;
}

export function useEbookMetadata(type: string, filePath?: string): { ebookMetadata: EbookMetadata | null } {
  const [ebookMetadata, setEbookMetadata] = useState<EbookMetadata | null>(null);

  useEffect(() => {
    if (type === 'file' && filePath) {
      const fileType = detectFileType(filePath);

      if (fileType.category === 'ebook') {
        const params = new URLSearchParams({ file_path: filePath });
        fetch(`/api/thumbnails/ebook-metadata?${params.toString()}`)
          .then(res => res.json())
          .then(data => {
            setEbookMetadata(data);
          })
          .catch(err => {
            console.error('[useEbookMetadata] Failed to fetch ebook metadata:', err);
            setEbookMetadata(null);
          });
      } else {
        setEbookMetadata(null);
      }
    } else {
      setEbookMetadata(null);
    }
  }, [type, filePath]);

  return { ebookMetadata };
}
