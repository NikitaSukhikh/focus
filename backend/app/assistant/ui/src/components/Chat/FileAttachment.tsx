/**
 * File attachment component for chat input.
 * Allows users to attach files (especially PDFs) to messages.
 */

import React, { useRef, useState } from 'react';
import { Plus, X, File, FileText, Image as ImageIcon } from 'lucide-react';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  uploadedPath?: string;
}

interface FileAttachmentProps {
  onFilesAttached: (files: AttachedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  attachedFiles: AttachedFile[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
}

export function FileAttachment({
  onFilesAttached,
  onFileRemove,
  attachedFiles,
  maxFiles = 5,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],
}: FileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError('');

    // Check if adding these files would exceed max files
    if (attachedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        setError(`File type not supported: ${file.name}`);
        continue;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        const maxMB = maxFileSize / (1024 * 1024);
        setError(`File too large: ${file.name} (max ${maxMB}MB)`);
        continue;
      }

      // Create attached file object
      const attachedFile: AttachedFile = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      };

      newFiles.push(attachedFile);
    }

    if (newFiles.length > 0) {
      onFilesAttached(newFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileId: string) => {
    onFileRemove(fileId);
    setError('');
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="file-attachment">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attach button */}
      <button
        type="button"
        onClick={handleButtonClick}
        className="attach-button w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        title="Attach files"
        disabled={attachedFiles.length >= maxFiles}
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Attached files list */}
      {attachedFiles.length > 0 && (
        <div className="attached-files-list mt-2 space-y-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="attached-file flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="text-gray-600 dark:text-gray-400">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(file.id)}
                className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-message mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* File count indicator */}
      {attachedFiles.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {attachedFiles.length} / {maxFiles} files attached
        </div>
      )}
    </div>
  );
}

export type { AttachedFile };
