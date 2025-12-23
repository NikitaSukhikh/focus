/**
 * User input bar for composing messages with file attachment support.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { FileAttachment, AttachedFile } from './FileAttachment';
import { uploadFile } from '../../services/api';

interface InputBarProps {
  onSendMessage: (message: string, files?: AttachedFile[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBar({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}: InputBarProps) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleFilesAttached = async (newFiles: AttachedFile[]) => {
    setIsUploading(true);

    // Upload files to backend
    const uploadedFiles: AttachedFile[] = [];

    for (const file of newFiles) {
      try {
        const response = await uploadFile(file.file);
        if (response.success && response.file_path) {
          uploadedFiles.push({
            ...file,
            uploadedPath: response.file_path,
          });
        } else {
          console.error(`Failed to upload ${file.name}:`, response.error);
          // Still add the file even if upload failed
          uploadedFiles.push(file);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        // Still add the file even if upload failed
        uploadedFiles.push(file);
      }
    }

    setAttachedFiles([...attachedFiles, ...uploadedFiles]);
    setIsUploading(false);
  };

  const handleFileRemove = (fileId: string) => {
    setAttachedFiles(attachedFiles.filter((f) => f.id !== fileId));
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    // Can send if there's either a message or files
    if (trimmedMessage || attachedFiles.length > 0) {
      const messageToSend = trimmedMessage || 'I\'ve attached some files for you to analyze.';
      onSendMessage(messageToSend, attachedFiles);
      setMessage('');
      setAttachedFiles([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (message.trim() || attachedFiles.length > 0) && !disabled && !isUploading;

  return (
    <div className="input-bar p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Input area */}
        <div className="flex items-end space-x-2">
          {/* File attachment button */}
          <div className="flex-shrink-0 self-end">
            <FileAttachment
              onFilesAttached={handleFilesAttached}
              onFileRemove={handleFileRemove}
              attachedFiles={attachedFiles}
            />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] max-h-[200px]"
            rows={1}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white transition-colors"
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Attached files list */}
        {attachedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileRemove(file.id)}
                  className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Remove file"
                >
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Remove</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload status */}
        {isUploading && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Uploading files...
          </div>
        )}


        {/* Help text */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
