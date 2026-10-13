export function billingEnabled() {
  return process.env.ASAAS_ENVIRONMENT === 'sandbox' && process.env.BILLING_SANDBOX_ENABLED === 'true';
}
export function sandboxUserAllowed(userId: string) {
  return (process.env.BILLING_TEST_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean).includes(userId);
}
