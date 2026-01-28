import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-medium
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;

  const variants = {
    primary: `
      bg-[var(--color-primary)] text-white
      hover:bg-[var(--color-primary-hover)]
      active:bg-[var(--color-primary-active)]
      focus-visible:ring-[var(--color-primary)]
    `,
    secondary: `
      bg-[var(--color-surface)] text-[var(--color-text-primary)]
      border border-[var(--color-border)]
      hover:bg-[var(--color-background)]
      active:bg-[var(--color-border-light)]
      focus-visible:ring-[var(--color-primary)]
    `,
    danger: `
      bg-[var(--color-alert)] text-white
      hover:opacity-90
      active:opacity-80
      focus-visible:ring-[var(--color-alert)]
    `,
    ghost: `
      bg-transparent text-[var(--color-text-primary)]
      hover:bg-[var(--color-background)]
      active:bg-[var(--color-border-light)]
      focus-visible:ring-[var(--color-primary)]
    `
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-[var(--radius-sm)] gap-1.5',
    md: 'px-4 py-2.5 text-base rounded-[var(--radius-md)] gap-2',
    lg: 'px-6 py-3 text-lg rounded-[var(--radius-md)] gap-2.5'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
