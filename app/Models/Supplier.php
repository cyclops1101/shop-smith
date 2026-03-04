<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'name',
        'contact_name',
        'email',
        'phone',
        'website',
        'address',
        'notes',
    ];

    public function materials(): HasMany
    {
        return $this->hasMany(Material::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
