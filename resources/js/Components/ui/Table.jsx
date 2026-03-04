export function Table({ className = '', children, ...props }) {
    return (
        <div className="w-full overflow-auto">
            <table
                {...props}
                className={'w-full caption-bottom text-sm ' + className}
            >
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ className = '', children, ...props }) {
    return (
        <thead
            {...props}
            className={'border-b border-gray-200 bg-gray-50 ' + className}
        >
            {children}
        </thead>
    );
}

export function TableBody({ className = '', children, ...props }) {
    return (
        <tbody
            {...props}
            className={'divide-y divide-gray-100 bg-white ' + className}
        >
            {children}
        </tbody>
    );
}

export function TableRow({ className = '', children, ...props }) {
    return (
        <tr
            {...props}
            className={'transition-colors hover:bg-gray-50 ' + className}
        >
            {children}
        </tr>
    );
}

export function TableHead({ className = '', children, ...props }) {
    return (
        <th
            {...props}
            className={'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ' + className}
        >
            {children}
        </th>
    );
}

export function TableCell({ className = '', children, ...props }) {
    return (
        <td
            {...props}
            className={'px-4 py-3 text-gray-700 ' + className}
        >
            {children}
        </td>
    );
}
