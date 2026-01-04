import { useEffect, useState } from 'react';

interface EbookMetadata {
  title: string;
  author: string | null;
}

export function useEbookMetadata(isEbookFile: boolean, filePath?: string): EbookMetadata | null {
  const [metadata, setMetadata] = useState<EbookMetadata | null>(null);

  useEffect(() => {
    if (isEbookFile && filePath) {
      const params = new URLSearchParams({ file_path: filePath });
      fetch(`/api/thumbnails/ebook-metadata?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          setMetadata(data);
        })
        .catch(err => {
          console.error('[useEbookMetadata] Failed to fetch ebook metadata:', err);
          setMetadata(null);
        });
    } else {
      setMetadata(null);
    }
  }, [isEbookFile, filePath]);

  return metadata;
}
