<?php

namespace App\Enums;

enum MaterialUnit: string
{
    case Piece = 'piece';
    case BoardFoot = 'board_foot';
    case LinearFoot = 'linear_foot';
    case SquareFoot = 'square_foot';
    case Sheet = 'sheet';
    case Gallon = 'gallon';
    case Quart = 'quart';
    case Pint = 'pint';
    case Oz = 'oz';
    case Lb = 'lb';
    case Kg = 'kg';
    case Each = 'each';
    case Box = 'box';
    case Bag = 'bag';

    public function label(): string
    {
        return match($this) {
            self::Piece => 'Piece',
            self::BoardFoot => 'Board Foot',
            self::LinearFoot => 'Linear Foot',
            self::SquareFoot => 'Square Foot',
            self::Sheet => 'Sheet',
            self::Gallon => 'Gallon',
            self::Quart => 'Quart',
            self::Pint => 'Pint',
            self::Oz => 'Oz',
            self::Lb => 'Lb',
            self::Kg => 'Kg',
            self::Each => 'Each',
            self::Box => 'Box',
            self::Bag => 'Bag',
        };
    }
}
