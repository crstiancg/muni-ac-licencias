<?php

namespace Tests\Feature\Taxpayers;

use App\Models\Taxpayer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * DNI (RENIEC) and RUC (SUNAT) lookup that fills forms. A registered
 * document answers from the taxpayer's file, unless the form asks for the
 * official data (remote=1), as when correcting a procedure or filling its
 * legal representative. Each found document is kept a while: every query
 * costs quota.
 */
class DocumentLookupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.apis_net.token' => 'test-token', 'services.apis_net.url' => 'https://api.test']);

        $this->actingAs(User::factory()->create());
    }

    private function reniecFinds(): void
    {
        Http::fake([
            'api.test/v2/reniec/dni*' => Http::response([
                'nombres' => 'ANA MARIA',
                'apellidoPaterno' => 'QUISPE',
                'apellidoMaterno' => 'MAMANI',
            ]),
        ]);
    }

    private function lookup(array $query = []): TestResponse
    {
        return $this->getJson(route('taxpayers.lookup', ['document_type' => 'dni', 'number' => '01234567', ...$query]));
    }

    public function test_a_registered_document_answers_from_the_taxpayer_file(): void
    {
        $this->reniecFinds();
        Taxpayer::factory()->create(['document_type' => 'dni', 'document_number' => '01234567', 'name' => 'NOMBRE EN FICHA']);

        $this->lookup()->assertOk()->assertJsonPath('source', 'local')->assertJsonPath('taxpayer.name', 'NOMBRE EN FICHA');

        Http::assertNothingSent();
    }

    public function test_remote_asks_reniec_even_when_the_document_is_registered(): void
    {
        $this->reniecFinds();
        Taxpayer::factory()->create(['document_type' => 'dni', 'document_number' => '01234567', 'name' => 'NOMBRE EN FICHA']);

        $this->lookup(['remote' => 1])
            ->assertOk()
            ->assertJsonPath('source', 'reniec')
            ->assertJsonPath('data.name', 'QUISPE MAMANI ANA MARIA');
    }

    public function test_a_found_document_is_not_asked_twice(): void
    {
        $this->reniecFinds();

        $this->lookup()->assertOk()->assertJsonPath('data.name', 'QUISPE MAMANI ANA MARIA');
        $this->lookup()->assertOk()->assertJsonPath('data.name', 'QUISPE MAMANI ANA MARIA');

        Http::assertSentCount(1);
    }

    public function test_a_document_not_found_is_asked_again_later(): void
    {
        Http::fake(['api.test/*' => Http::response([], 404)]);

        $this->lookup()->assertNotFound();
        $this->lookup()->assertNotFound();

        Http::assertSentCount(2);
    }
}
