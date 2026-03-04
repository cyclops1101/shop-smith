<?php

namespace App\Models;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

class Project extends Model
{
    use HasFactory, HasUlids, SoftDeletes, Searchable;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'status',
        'priority',
        'estimated_hours',
        'estimated_cost',
        'actual_cost',
        'sell_price',
        'started_at',
        'completed_at',
        'deadline',
        'notes',
        'is_commission',
        'client_name',
        'client_contact',
    ];

    protected function casts(): array
    {
        return [
            'status'       => ProjectStatus::class,
            'priority'     => ProjectPriority::class,
            'is_commission' => 'boolean',
            'started_at'   => 'datetime',
            'completed_at' => 'datetime',
            'deadline'     => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Project $project) {
            if (empty($project->slug)) {
                $slug = Str::slug($project->title);
                $original = $slug;
                $count = 1;

                while (static::withTrashed()->where('slug', $slug)->exists()) {
                    $slug = $original . '-' . $count++;
                }

                $project->slug = $slug;
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function toSearchableArray(): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'client_name' => $this->client_name,
            'notes'       => $this->notes,
        ];
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ProjectPhoto::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(ProjectNote::class);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    public function cutListBoards(): HasMany
    {
        return $this->hasMany(CutListBoard::class);
    }

    public function cutListPieces(): HasMany
    {
        return $this->hasMany(CutListPiece::class);
    }

    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class, 'project_materials')
            ->using(ProjectMaterial::class)
            ->withPivot(['quantity_used', 'cost_at_time', 'notes']);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
