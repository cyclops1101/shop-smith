<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PortfolioControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_portfolio_is_publicly_accessible(): void
    {
        $response = $this->get('/portfolio');

        $response->assertOk();
    }
}
