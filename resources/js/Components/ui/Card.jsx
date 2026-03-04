export function Card({ className = '', children, ...props }) {
    return (
        <div
            {...props}
            className={'rounded-lg border border-gray-200 bg-white shadow-sm ' + className}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className = '', children, ...props }) {
    return (
        <div
            {...props}
            className={'flex flex-col space-y-1.5 p-6 ' + className}
        >
            {children}
        </div>
    );
}

export function CardTitle({ className = '', children, ...props }) {
    return (
        <h3
            {...props}
            className={'text-lg font-semibold leading-none tracking-tight text-gray-900 ' + className}
        >
            {children}
        </h3>
    );
}

export function CardDescription({ className = '', children, ...props }) {
    return (
        <p
            {...props}
            className={'text-sm text-gray-500 ' + className}
        >
            {children}
        </p>
    );
}

export function CardContent({ className = '', children, ...props }) {
    return (
        <div
            {...props}
            className={'p-6 pt-0 ' + className}
        >
            {children}
        </div>
    );
}

export function CardFooter({ className = '', children, ...props }) {
    return (
        <div
            {...props}
            className={'flex items-center p-6 pt-0 ' + className}
        >
            {children}
        </div>
    );
}
