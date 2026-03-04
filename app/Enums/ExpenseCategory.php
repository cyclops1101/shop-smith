<?php

namespace App\Enums;

enum ExpenseCategory: string
{
    case Materials = 'materials';
    case Tools = 'tools';
    case ShopSupplies = 'shop_supplies';
    case Equipment = 'equipment';
    case Maintenance = 'maintenance';
    case Other = 'other';

    public function label(): string
    {
        return match($this) {
            self::Materials => 'Materials',
            self::Tools => 'Tools',
            self::ShopSupplies => 'Shop Supplies',
            self::Equipment => 'Equipment',
            self::Maintenance => 'Maintenance',
            self::Other => 'Other',
        };
    }
}
