// Storefront constants. Placeholders from spec §20 until confirmed; the settings table holds
// the same values for checkout (Phase 4), which will read them from the database.
export const STORE = {
  name: 'LaraDirect',
  freeDeliveryThreshold: 100, // GBP inc VAT (spec §20.4 placeholder)
  standardDelivery: 4.99,
  nextDayDelivery: 9.99,
  returnsDays: 30,
  phone: '0800 000 0000', // placeholder
  email: 'hello@laradirect.example', // placeholder
  company: {
    legalName: 'LaraDirect Ltd (placeholder)',
    number: '00000000',
    vat: 'GB000000000',
    address: 'Registered office address (placeholder)',
  },
} as const;
