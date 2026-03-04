const variantClasses = {
    default: 'bg-amber-100 text-amber-800 border-amber-200',
    secondary: 'bg-gray-100 text-gray-700 border-gray-200',
    destructive: 'bg-red-100 text-red-700 border-red-200',
    outline: 'bg-transparent text-gray-700 border-gray-300',
};

export default function Badge({
    variant = 'default',
    color,
    className = '',
    children,
    ...props
}) {
    const inlineStyle = color ? { backgroundColor: color, color: '#fff', borderColor: color } : undefined;

    return (
        <span
            {...props}
            style={inlineStyle}
            className={
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ' +
                (color ? '' : variantClasses[variant]) +
                ' ' +
                className
            }
        >
            {children}
        </span>
    );
}
