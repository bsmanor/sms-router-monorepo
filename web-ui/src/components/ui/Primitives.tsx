import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  elevated = false,
  ...props
}) => {
  return (
    <div
      className={`bg-surface border border-line-subtle rounded-2xl p-5 transition-colors ${
        elevated ? 'shadow-sm' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-line-subtle ${className}`}>
      <div>
        <h3 className="text-base font-bold text-content-primary tracking-tight flex items-center gap-2">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-content-muted mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ children, tone = 'neutral', size = 'sm', className = '' }) => {
  const toneClasses: Record<BadgeTone, string> = {
    success: 'bg-status-success-bg border-status-success-border text-status-success-text',
    warning: 'bg-status-warning-bg border-status-warning-border text-status-warning-text',
    danger: 'bg-status-danger-bg border-status-danger-border text-status-danger-text',
    info: 'bg-status-info-bg border-status-info-border text-status-info-text',
    brand: 'bg-brand-subtle border-brand-border text-brand',
    neutral: 'bg-surface-subtle border-line-subtle text-content-secondary',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full font-mono tracking-tight ${toneClasses[tone]} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'brand' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses: Record<string, string> = {
    primary: 'bg-action-primary text-action-primary-text hover:bg-action-primary-hover active:scale-[0.98]',
    secondary: 'bg-surface border border-line-subtle text-content-primary hover:bg-surface-subtle active:scale-[0.98]',
    brand: 'bg-brand text-white hover:opacity-90 active:scale-[0.98]',
    danger: 'bg-status-danger-bg border border-status-danger-border text-status-danger-text hover:opacity-90 active:scale-[0.98]',
    ghost: 'text-content-secondary hover:text-content-primary hover:bg-surface-subtle',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-xs font-semibold rounded-xl',
    lg: 'px-5 py-2.5 text-sm font-bold rounded-xl',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all select-none disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <input
      className={`w-full bg-surface-subtle border border-line-subtle rounded-xl px-3.5 py-2 text-xs text-content-primary placeholder-content-muted focus:outline-none focus:border-line-focus transition-colors ${className}`}
      {...props}
    />
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <select
      className={`bg-surface-subtle border border-line-subtle rounded-xl px-3.5 py-2 text-xs text-content-primary focus:outline-none focus:border-line-focus transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <textarea
      className={`w-full bg-surface-subtle border border-line-subtle rounded-xl p-3 text-xs text-content-primary placeholder-content-muted focus:outline-none focus:border-line-focus transition-colors ${className}`}
      {...props}
    />
  );
};

export const CodeBlock: React.FC<{
  code: string;
  className?: string;
  language?: string;
}> = ({ code, className = '', language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group rounded-xl overflow-hidden border border-line-subtle bg-surface-code text-slate-200 text-xs font-mono ${className}`}>
      {language && (
        <div className="flex justify-between items-center px-3 py-1.5 bg-black/40 border-b border-white/5 text-[10px] text-slate-400">
          <span>{language}</span>
          <button
            onClick={handleCopy}
            className="hover:text-white flex items-center gap-1 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}
      {!language && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
      <pre className="p-3.5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
    </div>
  );
};

export const MetricTile: React.FC<{
  label: string;
  value: React.ReactNode;
  subtext?: string;
  icon?: React.ReactNode;
  tone?: BadgeTone;
}> = ({ label, value, subtext, icon, tone = 'neutral' }) => {
  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between text-content-muted text-xs">
        <span className="font-medium">{label}</span>
        {icon && <span className="text-content-muted">{icon}</span>}
      </div>
      <div className="my-2">
        <span className="text-2xl font-bold tracking-tight text-content-primary">
          {value}
        </span>
      </div>
      {subtext && (
        <div className="text-[11px] text-content-muted flex items-center gap-1">
          {tone !== 'neutral' && (
            <span className={`w-1.5 h-1.5 rounded-full ${
              tone === 'success' ? 'bg-status-success-text' :
              tone === 'warning' ? 'bg-status-warning-text' :
              tone === 'danger' ? 'bg-status-danger-text' :
              tone === 'brand' ? 'bg-brand' : 'bg-status-info-text'
            }`} />
          )}
          <span>{subtext}</span>
        </div>
      )}
    </Card>
  );
};
