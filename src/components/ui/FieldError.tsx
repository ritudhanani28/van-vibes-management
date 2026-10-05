'use client';

import React from 'react';
import { CircleAlert } from 'lucide-react';

export interface FieldErrorProps {
  message?: string | null;
  id?: string;
  className?: string;
}

/**
 * Standard reusable field-level error component.
 * Renders directly below an invalid input with consistent design tokens.
 */
export function FieldError({ message, id, className = '' }: FieldErrorProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      className={`mt-1.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${className}`}
    >
      <CircleAlert className="w-4 h-4 shrink-0 text-red-600" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Standard reusable form-level error component.
 * Matches the exact design of the field-level error container for overall form/API failures.
 */
export function FormError({ message, id, className = '' }: FieldErrorProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      className={`p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${className}`}
    >
      <CircleAlert className="w-4 h-4 shrink-0 text-red-600" />
      <span>{message}</span>
    </div>
  );
}

export default FieldError;
