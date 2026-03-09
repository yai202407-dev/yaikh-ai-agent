import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    className = '',
    ...props
}) => {
    const variantClasses = {
        primary: 'bg-primary hover:bg-primary-hover text-white',
        secondary: 'bg-bg-card hover:bg-slate-700 text-text-main border border-border',
        danger: 'bg-danger hover:bg-red-600 text-white',
    };

    return (
        <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
