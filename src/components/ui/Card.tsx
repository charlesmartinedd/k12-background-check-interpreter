import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md'
}: CardProps) {
  const baseStyles = `
    bg-[var(--color-surface)]
    rounded-[var(--radius-lg)]
    overflow-hidden
  `;

  const variants = {
    default: 'shadow-[var(--shadow-sm)]',
    elevated: 'shadow-[var(--shadow-md)]',
    bordered: 'border border-[var(--color-border)]'
  };

  const paddings = {
    none: '',
    sm: 'p-[var(--space-sm)]',
    md: 'p-[var(--space-md)]',
    lg: 'p-[var(--space-lg)]'
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`border-b border-[var(--color-border)] pb-[var(--space-md)] mb-[var(--space-md)] ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-heading-3 text-[var(--color-text-primary)] ${className}`}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-body-sm text-[var(--color-text-secondary)] mt-1 ${className}`}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`border-t border-[var(--color-border)] pt-[var(--space-md)] mt-[var(--space-md)] ${className}`}>
      {children}
    </div>
  );
}
