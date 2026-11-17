<?php

namespace App\Services;

use App\Enums\DocumentType;
use App\Exceptions\DocumentLookupUnavailable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Looks up DNI (RENIEC) and RUC (SUNAT) through apis.net.pe.
 *
 * Token and URL come from config/services.php (APIS_NET_TOKEN), never from code.
 * Every query costs quota: a found DNI is kept 30 days (names do not change)
 * and a RUC one day (its SUNAT status does). Not found is asked again.
 */
class DocumentLookup
{
    /**
     * @return array{name: string, address: ?string, district: ?string, province: ?string, department: ?string, sunat_status: ?string, sunat_condition: ?string}|null
     *
     * @throws DocumentLookupUnavailable
     */
    public function find(DocumentType $type, string $number): ?array
    {
        $key = "document-lookup:{$type->value}:{$number}";

        if ($found = Cache::get($key)) {
            return $found;
        }

        $found = $this->ask($type, $number);

        if ($found !== null) {
            Cache::put($key, $found, $type === DocumentType::Dni ? now()->addDays(30) : now()->addDay());
        }

        return $found;
    }

    /**
     * @return array{name: string, address: ?string, district: ?string, province: ?string, department: ?string, sunat_status: ?string, sunat_condition: ?string}|null
     *
     * @throws DocumentLookupUnavailable
     */
    private function ask(DocumentType $type, string $number): ?array
    {
        $endpoint = match ($type) {
            DocumentType::Dni => '/v2/reniec/dni',
            DocumentType::Ruc => '/v2/sunat/ruc',
            DocumentType::Ce => null,
        };

        if ($endpoint === null) {
            return null;
        }

        $token = config('services.apis_net.token');

        if (blank($token)) {
            throw new DocumentLookupUnavailable;
        }

        try {
            $response = Http::baseUrl(config('services.apis_net.url'))
                ->withToken($token)
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout(10)
                ->get($endpoint, ['numero' => $number]);
        } catch (ConnectionException) {
            throw new DocumentLookupUnavailable;
        }

        if (in_array($response->status(), [404, 422], true)) {
            return null;
        }

        if ($response->failed()) {
            throw new DocumentLookupUnavailable;
        }

        $data = $response->json();

        return $type === DocumentType::Dni
            ? [
                'name' => trim("{$data['apellidoPaterno']} {$data['apellidoMaterno']} {$data['nombres']}"),
                'address' => null,
                'district' => null,
                'province' => null,
                'department' => null,
                'sunat_status' => null,
                'sunat_condition' => null,
            ]
            : [
                'name' => $data['razonSocial'],
                'address' => $data['direccion'] ?: null,
                'district' => $data['distrito'] ?: null,
                'province' => $data['provincia'] ?: null,
                'department' => $data['departamento'] ?: null,
                'sunat_status' => $data['estado'] ?? null,
                'sunat_condition' => $data['condicion'] ?? null,
            ];
    }
}
