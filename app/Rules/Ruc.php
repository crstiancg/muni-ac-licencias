<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * SUNAT RUC: 11 digits, a valid prefix and the modulo 11 check digit.
 */
class Ruc implements ValidationRule
{
    private const array WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

    /**
     * @param  list<string>  $prefixes
     */
    public function __construct(private array $prefixes = ['10', '15', '17', '20']) {}

    /**
     * Only natural persons (10 with DNI, 15 and 17 without one).
     */
    public static function naturalPerson(): self
    {
        return new self(['10', '15', '17']);
    }

    public static function isValid(string $ruc): bool
    {
        if (! preg_match('/^\d{11}$/', $ruc)) {
            return false;
        }

        $sum = 0;
        foreach (self::WEIGHTS as $index => $weight) {
            $sum += (int) $ruc[$index] * $weight;
        }

        $digit = 11 - ($sum % 11);
        $digit = match ($digit) {
            10 => 0,
            11 => 1,
            default => $digit,
        };

        return $digit === (int) $ruc[10];
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $value = (string) $value;

        if (! in_array(substr($value, 0, 2), $this->prefixes, true) || ! self::isValid($value)) {
            $fail('El campo :attribute no es válido.');
        }
    }
}
