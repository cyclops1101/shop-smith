export default function Select({
    options = [],
    placeholder,
    error = false,
    className = '',
    ...props
}) {
    return (
        <select
            {...props}
            className={
                'block w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 ' +
                (error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                    : 'border-gray-300 focus:border-amber-500 focus:ring-amber-200') +
                ' ' +
                className
            }
        >
            {placeholder && (
                <option value="">{placeholder}</option>
            )}
            {options.map(({ value, label }) => (
                <option key={value} value={value}>
                    {label}
                </option>
            ))}
        </select>
    );
}
