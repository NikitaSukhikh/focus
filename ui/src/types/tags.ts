export type TagColor = 'green' | 'blue' | 'yellow' | 'red';
// Empty string represents "no tag" to keep payloads simple for the backend.
export type TagValue = TagColor | '';

export const normalizeTag = (value: unknown): TagValue => {
  const tag = typeof value === 'string' ? value : '';
  return tag === 'green' || tag === 'blue' || tag === 'yellow' || tag === 'red' ? tag : '';
};
