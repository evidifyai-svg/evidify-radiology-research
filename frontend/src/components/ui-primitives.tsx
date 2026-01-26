// ui-primitives.tsx - Extracted Clinical UI Primitives
// Reusable components extracted from Evidify Clinical's App.tsx
// These form the foundation of the Clinical design system

import React, { useState, useEffect, ReactNode } from 'react';
import {
  Shield,
  Lock,
  FileText,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Activity,
  Search,
  Loader2,
  Settings,
  Home,
  X,
  Sparkles,
  Brain,
  Zap,
  Eye,
  EyeOff,
  Clock,
  Award,
  Play,
} from 'lucide-react';

// ============================================================================
// THEME CONSTANTS
// ============================================================================

export const theme = {
  colors: {
    // Background hierarchy (darkest to lightest)
    bgPrimary: 'bg-slate-900',
    bgSecondary: 'bg-slate-800',
    bgTertiary: 'bg-slate-700',
    bgInput: 'bg-slate-600',
    
    // Accent colors
    primary: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-700',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-amber-500/20 text-amber-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
    
    // Text colors
    textPrimary: 'text-white',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    textDimmed: 'text-slate-500',
  },
  
  spacing: {
    page: 'p-6',
    card: 'p-6',
    cardCompact: 'p-4',
    section: 'mb-8',
    gap: 'gap-4',
  },
  
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },
};

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

export function PageLayout({ children, maxWidth = '4xl' }: PageLayoutProps) {
  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
  }[maxWidth];

  return (
    <div className="min-h-screen p-6">
      <div className={`${widthClass} mx-auto`}>
        {children}
      </div>
    </div>
  );
}

interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: string;
}

export function SidebarLayout({ sidebar, children, sidebarWidth = 'w-64' }: SidebarLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className={`${sidebarWidth} bg-slate-800 border-r border-slate-700 flex flex-col`}>
        {sidebar}
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// NAVIGATION COMPONENTS
// ============================================================================

interface NavigationHeaderProps {
  onHome: () => void;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
}

export function NavigationHeader({ 
  onHome, 
  title, 
  subtitle,
  showBack = false,
  onBack,
  actions 
}: NavigationHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={onHome}
        className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        title="Go to Dashboard"
      >
        <Home className="w-5 h-5" />
      </button>
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {title && (
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number | string;
  onClick: () => void;
}

export function NavItem({ icon, label, isActive = false, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      {badge !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
          isActive ? 'bg-white/20' : 'bg-slate-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

interface TabNavProps {
  tabs: { id: string; label: string; icon?: ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// CARD COMPONENTS
// ============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <div className={`bg-slate-800 rounded-xl ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  demo?: ReactNode;
  onClick?: () => void;
}

export function FeatureCard({ 
  icon, 
  title, 
  description, 
  badge, 
  badgeColor = 'bg-blue-500',
  demo,
  onClick 
}: FeatureCardProps) {
  const [showDemo, setShowDemo] = useState(false);
  
  return (
    <div 
      className={`bg-slate-800/80 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-all hover:transform hover:scale-[1.02] ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white">{title}</h4>
            {badge && (
              <span className={`px-2 py-0.5 ${badgeColor} rounded-full text-xs font-medium`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          {demo && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDemo(!showDemo); }}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              {showDemo ? 'Hide Demo' : 'See Demo'}
            </button>
          )}
        </div>
      </div>
      {demo && showDemo && (
        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
          {demo}
        </div>
      )}
    </div>
  );
}

interface HeroCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  gradient?: 'blue' | 'amber' | 'green' | 'purple';
}

export function HeroCard({ title, subtitle, children, gradient = 'blue' }: HeroCardProps) {
  const gradientClass = {
    blue: 'from-blue-600 to-blue-800',
    amber: 'from-amber-600 to-orange-700',
    green: 'from-green-600 to-emerald-700',
    purple: 'from-purple-600 to-indigo-700',
  }[gradient];

  return (
    <div className={`bg-gradient-to-br ${gradientClass} rounded-xl p-6 mb-8`}>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {subtitle && <p className="text-white/70 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  alert?: boolean;
  onClick?: () => void;
}

export function StatCard({ icon, value, label, trend, alert = false, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-slate-800 rounded-xl p-4 hover:bg-slate-700 transition-colors text-left ${
        alert ? 'border border-amber-500/50' : ''
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      disabled={!onClick}
    >
      <div className={`mb-2 ${alert ? 'text-amber-400' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </button>
  );
}

// ============================================================================
// BUTTON COMPONENTS
// ============================================================================

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  onClick,
  className = ''
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    gradient: 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 text-blue-300',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  title?: string;
  variant?: 'default' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({ icon, onClick, title, variant = 'default', size = 'md' }: IconButtonProps) {
  const variantClasses = {
    default: 'text-slate-400 hover:text-white hover:bg-slate-700',
    danger: 'text-slate-400 hover:text-red-400 hover:bg-red-500/10',
    success: 'text-slate-400 hover:text-green-400 hover:bg-green-500/10',
  };

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg transition-colors ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {icon}
    </button>
  );
}

// ============================================================================
// BADGE COMPONENTS
// ============================================================================

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const variantClasses = {
    default: 'bg-slate-600 text-slate-300',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'pending' | 'completed' | 'error' | 'draft';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = {
    active: { variant: 'success' as const, defaultLabel: 'Active' },
    pending: { variant: 'warning' as const, defaultLabel: 'Pending' },
    completed: { variant: 'success' as const, defaultLabel: 'Completed' },
    error: { variant: 'danger' as const, defaultLabel: 'Error' },
    draft: { variant: 'default' as const, defaultLabel: 'Draft' },
  };

  const { variant, defaultLabel } = config[status];

  return <Badge variant={variant}>{label || defaultLabel}</Badge>;
}

// ============================================================================
// ALERT COMPONENTS
// ============================================================================

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Alert({ variant, title, children, icon, action }: AlertProps) {
  const variantClasses = {
    info: 'bg-blue-500/10 border-blue-500/30',
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
  };

  const iconColors = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  };

  const defaultIcons = {
    info: <Info className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    danger: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div className={`border rounded-xl p-4 ${variantClasses[variant]}`}>
      <div className="flex items-start gap-3">
        <div className={iconColors[variant]}>
          {icon || defaultIcons[variant]}
        </div>
        <div className="flex-1">
          {title && <div className={`font-medium ${iconColors[variant]} mb-1`}>{title}</div>}
          <div className="text-sm text-slate-300">{children}</div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// FORM COMPONENTS
// ============================================================================

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  disabled?: boolean;
  className?: string;
}

export function Input({ value, onChange, placeholder, type = 'text', disabled, className = '' }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full bg-slate-600 rounded-lg px-3 py-2 
        focus:outline-none focus:ring-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

export function Select({ value, onChange, options, placeholder, disabled }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="
        w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2
        focus:outline-none focus:ring-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showHeader?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', showHeader = true }: ModalProps) {
  const [animateIn, setAnimateIn] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimateIn(true), 50);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
        rounded-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden 
        border border-slate-700 shadow-2xl 
        transition-all duration-300
        ${animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}>
        {showHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LIST COMPONENTS
// ============================================================================

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
}

export function ListItem({ title, subtitle, icon, badge, onClick, showChevron = true }: ListItemProps) {
  return (
    <div
      className={`
        flex items-center justify-between p-3 bg-slate-700/50 rounded-lg 
        hover:bg-slate-700 transition-colors
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="font-medium">{title}</div>
          {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        {showChevron && onClick && <ChevronRight className="w-5 h-5 text-slate-400" />}
      </div>
    </div>
  );
}

// ============================================================================
// STATUS COMPONENTS
// ============================================================================

interface AIStatusIndicatorProps {
  isAvailable: boolean;
  modelName?: string;
}

export function AIStatusIndicator({ isAvailable, modelName }: AIStatusIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
    }`}>
      <Activity className="w-4 h-4" />
      {isAvailable ? `AI: ${modelName || 'Ready'}` : 'AI: Limited'}
    </div>
  );
}

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
    </div>
  );
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-slate-400">{message}</p>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-700';
  const variantClasses = {
    text: 'h-4 rounded',
    rect: 'rounded-lg',
    circle: 'rounded-full',
  };

  return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />;
}

// ============================================================================
// EMPTY STATE COMPONENTS
// ============================================================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="text-slate-600 mb-4 flex justify-center">{icon}</div>}
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-slate-400 mb-6 max-w-md mx-auto">{description}</p>}
      {action}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Icons re-export for convenience
  Shield,
  Lock,
  FileText,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Activity,
  Search,
  Loader2,
  Settings,
  Home,
  X,
  Sparkles,
  Brain,
  Zap,
  Eye,
  EyeOff,
  Clock,
  Award,
  Play,
};
