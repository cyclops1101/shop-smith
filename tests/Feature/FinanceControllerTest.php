<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FinanceControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_is_redirected_from_finance(): void
    {
        $response = $this->get('/finance');

        $response->assertRedirect();
    }

    #[Test]
    public function test_authenticated_user_can_view_finance_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/finance');

        $response->assertOk();
    }
}
