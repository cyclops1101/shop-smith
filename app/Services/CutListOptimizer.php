<?php

namespace App\Services;

class CutListOptimizer
{
    /**
     * Run First Fit Decreasing bin packing on boards and pieces.
     *
     * Each board: ['id' => string, 'label' => string, 'length' => float, 'width' => float, 'quantity' => int]
     * Each piece: ['id' => string, 'label' => string, 'length' => float, 'width' => float, 'quantity' => int, 'grain_direction' => bool]
     *
     * Returns: ['boards' => [...board assignments...], 'unplaced' => [...pieces that didn't fit...], 'summary' => [...]]
     */
    public function optimize(array $boards, array $pieces): array
    {
        // Expand boards by quantity into individual stock boards
        $stockBoards = [];
        foreach ($boards as $board) {
            for ($i = 0; $i < ($board['quantity'] ?? 1); $i++) {
                $stockBoards[] = [
                    'source_id' => $board['id'] ?? null,
                    'label'     => $board['label'] . ($board['quantity'] > 1 ? ' #' . ($i + 1) : ''),
                    'length'    => (float) $board['length'],
                    'width'     => (float) $board['width'],
                    'cuts'      => [],
                    'remaining' => $this->buildFreeRects((float) $board['length'], (float) $board['width']),
                ];
            }
        }

        // Expand pieces by quantity and sort by area descending (FFD)
        $cutPieces = [];
        foreach ($pieces as $piece) {
            for ($i = 0; $i < ($piece['quantity'] ?? 1); $i++) {
                $cutPieces[] = [
                    'source_id'       => $piece['id'] ?? null,
                    'label'           => $piece['label'] . ($piece['quantity'] > 1 ? ' #' . ($i + 1) : ''),
                    'length'          => (float) $piece['length'],
                    'width'           => (float) $piece['width'],
                    'grain_direction' => (bool) ($piece['grain_direction'] ?? false),
                    'area'            => (float) $piece['length'] * (float) $piece['width'],
                ];
            }
        }

        // Sort pieces largest-first (FFD)
        usort($cutPieces, fn ($a, $b) => $b['area'] <=> $a['area']);

        $unplaced = [];

        // First Fit Decreasing
        foreach ($cutPieces as $piece) {
            $placed = false;
            foreach ($stockBoards as &$board) {
                $position = $this->findFit($board['remaining'], $piece['length'], $piece['width'], $piece['grain_direction']);
                if ($position !== null) {
                    $board['cuts'][] = [
                        'label'  => $piece['label'],
                        'length' => $piece['length'],
                        'width'  => $piece['width'],
                        'x'      => $position['x'],
                        'y'      => $position['y'],
                    ];
                    $board['remaining'] = $this->splitFreeRects(
                        $board['remaining'],
                        $position['x'],
                        $position['y'],
                        $piece['length'],
                        $piece['width'],
                    );
                    $placed = true;

                    break;
                }
            }
            unset($board);
            if (! $placed) {
                $unplaced[] = [
                    'label'  => $piece['label'],
                    'length' => $piece['length'],
                    'width'  => $piece['width'],
                ];
            }
        }

        // Filter to only boards that have cuts
        $usedBoards = array_values(array_filter($stockBoards, fn ($b) => count($b['cuts']) > 0));

        // Build summary
        $totalBoardArea = 0;
        $totalCutArea   = 0;
        foreach ($usedBoards as &$board) {
            $boardArea = $board['length'] * $board['width'];
            $cutArea   = array_sum(array_map(fn ($c) => $c['length'] * $c['width'], $board['cuts']));
            $board['total_area']   = round($boardArea, 2);
            $board['used_area']    = round($cutArea, 2);
            $board['waste_area']   = round($boardArea - $cutArea, 2);
            $board['efficiency']   = $boardArea > 0 ? round(($cutArea / $boardArea) * 100, 1) : 0;
            unset($board['remaining']);
            $totalBoardArea += $boardArea;
            $totalCutArea += $cutArea;
        }
        unset($board);

        return [
            'boards'   => $usedBoards,
            'unplaced' => $unplaced,
            'summary'  => [
                'boards_used'         => count($usedBoards),
                'pieces_placed'       => count($cutPieces) - count($unplaced),
                'pieces_unplaced'     => count($unplaced),
                'total_board_area'    => round($totalBoardArea, 2),
                'total_cut_area'      => round($totalCutArea, 2),
                'total_waste_area'    => round($totalBoardArea - $totalCutArea, 2),
                'overall_efficiency'  => $totalBoardArea > 0 ? round(($totalCutArea / $totalBoardArea) * 100, 1) : 0,
            ],
        ];
    }

    private function buildFreeRects(float $length, float $width): array
    {
        return [['x' => 0, 'y' => 0, 'length' => $length, 'width' => $width]];
    }

    /**
     * Find a free rectangle that can fit the piece. Returns position or null.
     */
    private function findFit(array $freeRects, float $pieceLength, float $pieceWidth, bool $grainDirection): ?array
    {
        // Sort free rects by area (smallest that fits first for tighter packing)
        usort($freeRects, fn ($a, $b) => ($a['length'] * $a['width']) <=> ($b['length'] * $b['width']));

        foreach ($freeRects as $rect) {
            // Normal orientation
            if ($pieceLength <= $rect['length'] && $pieceWidth <= $rect['width']) {
                return ['x' => $rect['x'], 'y' => $rect['y']];
            }
            // Rotated (only if grain direction doesn't matter)
            if (! $grainDirection && $pieceWidth <= $rect['length'] && $pieceLength <= $rect['width']) {
                return ['x' => $rect['x'], 'y' => $rect['y'], 'rotated' => true];
            }
        }

        return null;
    }

    /**
     * After placing a piece, split the remaining free space using the guillotine method.
     */
    private function splitFreeRects(array $freeRects, float $x, float $y, float $pLength, float $pWidth): array
    {
        $newRects = [];

        foreach ($freeRects as $rect) {
            // Check if piece overlaps this free rect
            if ($x < $rect['x'] + $rect['length'] && $x + $pLength > $rect['x']
                && $y < $rect['y'] + $rect['width'] && $y + $pWidth > $rect['y']) {
                // Right remainder
                $rightX = $x + $pLength;
                if ($rightX < $rect['x'] + $rect['length']) {
                    $newRects[] = [
                        'x'      => $rightX,
                        'y'      => $rect['y'],
                        'length' => $rect['x'] + $rect['length'] - $rightX,
                        'width'  => $rect['width'],
                    ];
                }
                // Top remainder
                $topY = $y + $pWidth;
                if ($topY < $rect['y'] + $rect['width']) {
                    $newRects[] = [
                        'x'      => $rect['x'],
                        'y'      => $topY,
                        'length' => $rect['length'],
                        'width'  => $rect['y'] + $rect['width'] - $topY,
                    ];
                }
                // Bottom-left (if piece doesn't start at rect origin)
                if ($y > $rect['y']) {
                    $newRects[] = [
                        'x'      => $rect['x'],
                        'y'      => $rect['y'],
                        'length' => $rect['length'],
                        'width'  => $y - $rect['y'],
                    ];
                }
                // Left remainder
                if ($x > $rect['x']) {
                    $newRects[] = [
                        'x'      => $rect['x'],
                        'y'      => $rect['y'],
                        'length' => $x - $rect['x'],
                        'width'  => $rect['width'],
                    ];
                }
            } else {
                // No overlap — keep rect as-is
                $newRects[] = $rect;
            }
        }

        // Remove very small rects (< 1 sq inch)
        return array_values(array_filter($newRects, fn ($r) => $r['length'] * $r['width'] >= 1.0));
    }
}
