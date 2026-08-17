export function isActive(expiryDate?: string | null) {
    return Boolean(expiryDate && Date.parse(expiryDate) > Date.now());
}
