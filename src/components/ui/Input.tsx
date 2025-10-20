import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const baseClasses = 'w-full p-4 rounded-lg border-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none transition-colors';
  const borderClasses = error 
    ? 'border-red-500 focus:border-red-500' 
    : 'border-gray-200 dark:border-gray-600 focus:border-primary';
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  const baseClasses = 'w-full p-4 rounded-lg border-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none transition-colors resize-none';
  const borderClasses = error 
    ? 'border-red-500 focus:border-red-500' 
    : 'border-gray-200 dark:border-gray-600 focus:border-primary';
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}