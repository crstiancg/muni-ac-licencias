/**
 * @laravel/passkeys reports errors in English. The browser raises the same
 * "cancelled" error when the user closes the dialog, when it times out and
 * when there is no passkey saved for this site, so the text covers all three.
 */
const MESSAGES: Record<string, string> = {
    'The passkey operation was cancelled.':
        'No se completó la operación con la llave de acceso. Si no tienes una llave guardada para este sitio, ingresa con tu correo y contraseña.',
    'Passkeys are not supported in this browser.':
        'Este navegador no admite llaves de acceso.',
    'This device is already registered as a passkey.':
        'Este dispositivo ya está registrado como llave de acceso.',
};

export function passkeyError(error: string | null | undefined): string | null {
    if (!error) {
        return null;
    }

    return MESSAGES[error] ?? error;
}
