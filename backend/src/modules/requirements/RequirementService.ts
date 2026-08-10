import type { ProjectInput, RequirementAnalysis } from '@archspace/shared';

const capabilityMap: Array<[RegExp, string]> = [
  [/auth|login|user|account/i, 'Authentication and user profiles'],
  [/browse|catalog|restaurant|product|search/i, 'Catalog browsing and search'],
  [/cart|basket/i, 'Cart management'],
  [/order|checkout/i, 'Order lifecycle management'],
  [/pay|payment|billing/i, 'Payment processing'],
  [/deliver|tracking|driver|shipment/i, 'Delivery tracking'],
  [/notify|email|sms|push/i, 'Notifications'],
  [/admin|dashboard/i, 'Operational admin dashboard'],
  [/review|rating/i, 'Ratings and reviews'],
];

export function analyzeRequirements(input: ProjectInput): RequirementAnalysis {
  const text = `${input.description} ${input.requirements} ${input.optionalRequirements}`;
  const functional = capabilityMap
    .filter(([pattern]) => pattern.test(text))
    .map(([, capability]) => capability);

  const uniqueFunctional = Array.from(new Set(functional));
  if (uniqueFunctional.length === 0) {
    uniqueFunctional.push('Core product workflow', 'User-facing application experience');
  }

  const nonFunctional = [
    `Scale target: ${input.expectedScale}`,
    'Secure authentication and authorization boundaries',
    'Observable service/API behavior',
    'Recoverable integrations with graceful degradation',
  ];

  if (/scalable|scale|traffic|10m|million/i.test(text)) {
    nonFunctional.push('Horizontal scalability and cache-friendly read paths');
  }
  if (/payment|pay/i.test(text)) {
    nonFunctional.push('Strong consistency around payments and order state transitions');
  }

  const missingQuestions = [
    !/admin|operator/i.test(text) ? 'Is an admin or operations console required?' : '',
    !/notification|email|sms|push/i.test(text) ? 'Which notification channels are required?' : '',
    !/region|country|currency/i.test(text) ? 'Which regions, currencies, and compliance requirements matter?' : '',
  ].filter(Boolean);

  const reasoning = [
    `Frontend preference '${input.frontendPreference}' is honored unless the architecture needs a stronger reason to change it.`,
    `Backend preference '${input.backendPreference}' fits a modular monolith control plane for this portfolio product.`,
    `Database preference '${input.databasePreference}' is used as source-of-truth storage where relational consistency is useful.`,
  ];

  return {
    summary: `${input.name} needs ${uniqueFunctional.join(', ').toLowerCase()} with clear reliability and security boundaries.`,
    functional: uniqueFunctional,
    nonFunctional,
    missingQuestions,
    recommendedCapabilities: uniqueFunctional,
    reasoning,
  };
}
