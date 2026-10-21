<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * The RENIEC/SUNAT lookup is not configured or did not answer.
 */
class DocumentLookupUnavailable extends RuntimeException {}
