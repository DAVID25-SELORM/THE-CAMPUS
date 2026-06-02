/**
 * Paystack inline payment integration.
 * Set VITE_PAYSTACK_PUBLIC_KEY in your .env file.
 * Get your key from https://dashboard.paystack.com/#/settings/developer
 */

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Opens the Paystack payment modal.
 * @param {object} options
 * @param {string} options.email       - Payer email
 * @param {number} options.amountGHS   - Amount in GHS (converted to pesewas internally)
 * @param {string} options.reference   - Unique payment reference
 * @param {string} options.description - What the payment is for
 * @param {function} options.onSuccess - Called with transaction data on success
 * @param {function} options.onClose   - Called when modal is closed without payment
 */
export async function initiatePayment({ email, amountGHS, reference, description, onSuccess, onClose }) {
  if (!PAYSTACK_KEY) {
    alert("Paystack public key is not configured. Add VITE_PAYSTACK_PUBLIC_KEY to your .env file.");
    return;
  }

  await loadPaystackScript();

  const handler = window.PaystackPop.setup({
    key:       PAYSTACK_KEY,
    email,
    amount:    Math.round(amountGHS * 100), // GHS → pesewas
    currency:  "GHS",
    ref:       reference || `UC-${Date.now()}`,
    label:     description,
    channels:  ["card", "mobile_money", "bank"],
    callback:  (response) => { if (onSuccess) onSuccess(response); },
    onClose:   () => { if (onClose) onClose(); }
  });

  handler.openIframe();
}

export function generateRef(prefix = "UC") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export const isPaystackConfigured = Boolean(PAYSTACK_KEY);
