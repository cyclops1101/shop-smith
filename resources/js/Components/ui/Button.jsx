const variantClasses = {
    default: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 border-transparent',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400 border-transparent',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400 border-transparent',
    outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-400',
};

const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

const Spinner = () => (
    <svg
        className="mr-2 h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
    </svg>
);

export default function Button({
    variant = 'default',
    size = 'md',
    disabled = false,
    loading = false,
    className = '',
    children,
    ...props
}) {
    const isDisabled = disabled || loading;

    return (
        <button
            {...props}
            disabled={isDisabled}
            className={
                'inline-flex items-center justify-center rounded-md border font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
                variantClasses[variant] +
                ' ' +
                sizeClasses[size] +
                ' ' +
                (isDisabled ? 'cursor-not-allowed opacity-60 ' : '') +
                className
            }
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
}
