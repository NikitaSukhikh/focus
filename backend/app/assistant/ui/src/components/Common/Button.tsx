// Reusable button component.

import React from 'react';
type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;
export function Button(props: Props) {
  return <button {...props} />;
}