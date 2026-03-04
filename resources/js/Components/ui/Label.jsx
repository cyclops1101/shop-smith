export default function Label({ className = '', children, ...props }) {
    return (
        <label
            {...props}
            className={'block text-sm font-medium text-gray-700 ' + className}
        >
            {children}
        </label>
    );
}
