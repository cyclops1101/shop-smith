import { Head, router } from '@inertiajs/react';

export default function PortfolioIndex({ photos = [], tags = [], activeTag }) {
    const handleTagFilter = (tagId) => {
        if (tagId === activeTag) {
            router.get(route('portfolio.index'));
        } else {
            router.get(route('portfolio.index'), { tag: tagId });
        }
    };

    return (
        <>
            <Head title="Portfolio" />
            <div className="min-h-screen bg-white">
                {/* Header */}
                <header className="border-b border-gray-100 bg-white">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            Portfolio
                        </h1>
                        <p className="mt-2 text-gray-500">
                            A selection of recent woodworking projects.
                        </p>
                    </div>
                </header>

                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Tag Filters */}
                    {tags.length > 0 && (
                        <div className="mb-8 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => router.get(route('portfolio.index'))}
                                className={
                                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ' +
                                    (!activeTag
                                        ? 'border-gray-900 bg-gray-900 text-white'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')
                                }
                            >
                                All
                            </button>
                            {tags.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleTagFilter(tag.id)}
                                    className={
                                        'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ' +
                                        (activeTag === tag.id
                                            ? 'text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-50')
                                    }
                                    style={
                                        activeTag === tag.id
                                            ? {
                                                  backgroundColor: tag.color,
                                                  borderColor: tag.color,
                                              }
                                            : { borderColor: tag.color + '60' }
                                    }
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Gallery Grid */}
                    {photos.length === 0 ? (
                        <div className="py-24 text-center">
                            <p className="text-lg text-gray-400">
                                {activeTag
                                    ? 'No portfolio photos match this filter.'
                                    : 'No portfolio photos yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="mb-6 break-inside-avoid overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                                >
                                    {/* Photo */}
                                    <div className="aspect-auto bg-gray-100">
                                        <img
                                            src={'/storage/' + photo.file_path}
                                            alt={photo.caption || photo.project_title}
                                            className="h-auto w-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>

                                    {/* Caption & Meta */}
                                    <div className="p-4">
                                        {photo.caption && (
                                            <p className="text-sm text-gray-700">{photo.caption}</p>
                                        )}
                                        {photo.project_title && (
                                            <p className="mt-1 text-xs text-gray-400">
                                                {photo.project_title}
                                            </p>
                                        )}
                                        {photo.tags && photo.tags.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {photo.tags.map((tag) => (
                                                    <span
                                                        key={tag.id}
                                                        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                                        style={{ backgroundColor: tag.color }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
                    Built with Workshop Manager
                </footer>
            </div>
        </>
    );
}
