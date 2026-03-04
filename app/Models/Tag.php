<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Tag extends Model
{
    use HasFactory, HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'color',
    ];

    public function projects(): MorphToMany
    {
        return $this->morphedByMany(Project::class, 'taggable');
    }

    public function materials(): MorphToMany
    {
        return $this->morphedByMany(Material::class, 'taggable');
    }

    public function tools(): MorphToMany
    {
        return $this->morphedByMany(Tool::class, 'taggable');
    }
}
