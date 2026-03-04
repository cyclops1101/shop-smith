<?php

namespace App\Enums;

enum ProjectStatus: string
{
    case Planned = 'planned';
    case Designing = 'designing';
    case InProgress = 'in_progress';
    case Finishing = 'finishing';
    case OnHold = 'on_hold';
    case Completed = 'completed';
    case Archived = 'archived';

    public function label(): string
    {
        return match($this) {
            self::Planned => 'Planned',
            self::Designing => 'Designing',
            self::InProgress => 'In Progress',
            self::Finishing => 'Finishing',
            self::OnHold => 'On Hold',
            self::Completed => 'Completed',
            self::Archived => 'Archived',
        };
    }
}
