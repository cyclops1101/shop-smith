<?php

namespace App\Enums;

enum MaintenanceType: string
{
    case BladeChange = 'blade_change';
    case Alignment = 'alignment';
    case Cleaning = 'cleaning';
    case Lubrication = 'lubrication';
    case BeltReplacement = 'belt_replacement';
    case Calibration = 'calibration';
    case FilterChange = 'filter_change';
    case Other = 'other';

    public function label(): string
    {
        return match($this) {
            self::BladeChange => 'Blade Change',
            self::Alignment => 'Alignment',
            self::Cleaning => 'Cleaning',
            self::Lubrication => 'Lubrication',
            self::BeltReplacement => 'Belt Replacement',
            self::Calibration => 'Calibration',
            self::FilterChange => 'Filter Change',
            self::Other => 'Other',
        };
    }
}
