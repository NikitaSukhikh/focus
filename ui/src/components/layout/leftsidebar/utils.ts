import { ObjectResponse, ObjectCreatePayload } from '../../../api/objects';

export const mapObjectToPayload = (obj: ObjectResponse): ObjectCreatePayload | null => {
  const meta = (obj.metadata || {}) as Record<string, any>;
  const base: ObjectCreatePayload = {
    type: obj.type,
    title: obj.title,
    description: obj.description,
    tags: (obj as any).tags || [],
    x: typeof meta.x === 'number' ? meta.x : undefined,
    y: typeof meta.y === 'number' ? meta.y : undefined,
  };

  switch (obj.type) {
    case 'link':
      base.url = meta.url as string | undefined;
      base.favicon_url = meta.favicon_url as string | undefined;
      base.thumbnail_url = meta.thumbnail_url as string | undefined;
      break;
    case 'file':
      base.file_path = meta.file_path as string | undefined;
      base.mime_type = meta.mime_type as string | undefined;
      break;
    case 'google_drive':
      base.drive_file_id = meta.drive_file_id as string | undefined;
      base.drive_file_name = meta.drive_file_name as string | undefined;
      base.mime_type = meta.mime_type as string | undefined;
      base.web_view_link = meta.web_view_link as string | undefined;
      break;
    case 'gmail':
      base.thread_id = meta.thread_id as string | undefined;
      base.message_id = meta.message_id as string | undefined;
      base.subject = (meta.subject as string | undefined) || obj.title;
      base.sender = meta.sender as string | undefined;
      base.snippet = meta.snippet as string | undefined;
      break;
    case 'text':
      base.content = meta.content as string | undefined;
      if (meta.service) base.service = meta.service as string;
      break;
    default:
      break;
  }

  // If required type-specific data is missing, skip duplication for that object.
  if (obj.type === 'link' && !base.url) return null;
  if (obj.type === 'file' && !base.file_path) return null;
  if (obj.type === 'google_drive' && !base.drive_file_id) return null;
  if (obj.type === 'gmail' && !base.thread_id) return null;
  if (obj.type === 'text' && !base.content) return null;

  return base;
};

export const generateUniqueName = (baseName: string, existingNames: Set<string>): string => {
  let candidate = baseName;
  let suffix = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} ${suffix}`;
    suffix += 1;
  }
  return candidate;
};
