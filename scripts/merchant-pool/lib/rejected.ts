/**
 * Groups that met the static eligibility rules but must not share a merchant: the canary (or a
 * regression) showed why. eligibility stops proposing them, migrate refuses them, and a test fails
 * if one reaches MERCHANT_POOL. Without this list the reason lived only in a commit message, and
 * the classifier kept offering the group to whoever came next.
 *
 * A group is identified by what the merchant needs (country, kind, processor configs), not by its
 * suggested key, so the entry still matches if the key naming changes.
 *
 * To reconsider one: do what `revisit` says, run merchant-pool:canary, and remove the entry only
 * if it passes.
 */
export interface RejectedGroup {
  country: string;
  kind: 'plain' | 'checkout';
  /** processorsConfig export names, as eligibility reports them. */
  processors: string[];
  reason: string;
  evidence: string;
  rejectedOn: string;
  revisit: string;
}

export const REJECTED_GROUPS: readonly RejectedGroup[] = [
  {
    country: 'MX',
    kind: 'plain',
    processors: ['mercadoPagoProcessorAuthorize'],
    reason:
      'Concurrent purchases on one merchant are declined (DP-8001 / DP-4200): Mercado Pago ' +
      'applies velocity rules per merchant, so sharing it breaks tests under load.',
    evidence:
      'merchant-pool:canary 2026-09-30: worker mode 17/17, shared mode 19/34 with declines in ' +
      'bursts across all 3 replicas; an earlier canary had passed 34/34, so it depends on load.',
    rejectedOn: '2026-09-30',
    revisit:
      'Only if Mercado Pago sandbox drops the per-merchant velocity rule, or with one replica per ' +
      'spec (which removes the benefit).',
  },
  {
    country: 'MX',
    kind: 'plain',
    processors: ['conektaProcessorAuthorize'],
    reason:
      'Its specs are test.fixme, so nothing can be verified: a canary over skipped tests says ' +
      'nothing about sharing the merchant.',
    evidence:
      'merchant-pool:canary 2026-09-30: 0/20 passed, all skipped (37 Conekta specs are fixme).',
    rejectedOn: '2026-09-30',
    revisit: 'When the Conekta specs run again: rerun the canary and drop this entry if it passes.',
  },
  {
    country: 'MX',
    kind: 'plain',
    processors: ['paypalACDCProcessorAuthorize'],
    reason:
      'Concurrent purchases on one merchant are declined (DP-20000): the same per-merchant ' +
      'velocity behaviour as Mercado Pago.',
    evidence:
      'merchant-pool:canary 2026-10-09: worker mode 10/11, shared mode 14/22 with 8 declines ' +
      'between 14:26:14 and 14:26:33, all on the first purchase of each spec.',
    rejectedOn: '2026-10-09',
    revisit: 'Only if PayPal sandbox stops declining concurrent purchases on one merchant.',
  },
  {
    country: 'MX',
    kind: 'checkout',
    processors: ['paypalWalletProcessor', 'cashProcessor'],
    reason:
      'Its specs log in to the same PayPal buyer and vault it on the merchant: on a shared ' +
      'merchant they hung or failed together, and ENTP1-T2090 fails its redirect-view screenshot.',
    evidence:
      'merchant-pool:canary 2026-10-09, twice: worker mode 3/3 both times, shared mode 4/6 and ' +
      '0/6 (ENTP1-T2298 and T2427 timed out in the PayPal login/consent at the same second).',
    rejectedOn: '2026-10-09',
    revisit:
      'With a PayPal buyer account per spec, and ENTP1-T2090 passing its screenshot on its own.',
  },
  {
    country: 'AR',
    kind: 'plain',
    processors: ['prismaPaywayProcessor'],
    reason:
      'Concurrent purchases on one merchant are declined (DP-4200), the same per-merchant velocity ' +
      'behaviour as Mercado Pago.',
    evidence:
      'merchant-pool:canary 2026-10-09: worker mode 5/5, shared mode 8/10 with PF-T44 and PF-T49 ' +
      'declined at the same second (16:35:54).',
    rejectedOn: '2026-10-09',
    revisit: 'Only if Prisma sandbox stops declining concurrent purchases on one merchant.',
  },
  {
    country: 'AR',
    kind: 'plain',
    processors: ['prismaPaywayProcessorAuthorize'],
    reason:
      'Its purchases are declined (DP-4200) even with a merchant per worker, so a canary cannot ' +
      'tell sharing apart from the PSP; shared mode declined all four specs at once.',
    evidence:
      'merchant-pool:canary 2026-10-09: worker mode 2/5 (PF-T50, T51, T53 declined), shared mode ' +
      '2/10 with every decline at 16:23:39. PF-T51 and T53 already fail in the regressions.',
    rejectedOn: '2026-10-09',
    revisit: 'When the Prisma authorize specs pass on their own: rerun the canary.',
  },
];

const id = (g: { country: string; kind: string; processors: readonly string[] }) =>
  `${g.country}|${g.kind}|${[...g.processors].sort().join('+')}`;

export function findRejected(group: {
  country: string;
  kind: string;
  processors: readonly string[];
}): RejectedGroup | undefined {
  return REJECTED_GROUPS.find((r) => id(r) === id(group));
}

/**
 * Specs whose group shares a merchant fine but which fail on their own, pooled or not, so a canary
 * cannot admit them. eligibility blocks them by test case id (the file name); without this they
 * came back in every wave (wave 5 re-proposed the four Cybersource specs wave 4 had left out).
 */
export interface RejectedSpec {
  reason: string;
  rejectedOn: string;
  revisit: string;
}

const CYBERSOURCE_DECLINES: RejectedSpec = {
  reason: 'Cybersource declines it with or without the pool (wave 4, docs section 4.16).',
  rejectedOn: '2026-10-09',
  revisit: 'When it passes in the regressions with its own merchant.',
};

export const REJECTED_SPECS: Readonly<Record<string, RejectedSpec>> = {
  'PI-T905': CYBERSOURCE_DECLINES,
  'PI-T1087': CYBERSOURCE_DECLINES,
  'PI-T1248': CYBERSOURCE_DECLINES,
  'PI-T1259': CYBERSOURCE_DECLINES,
  'PAYM-T2190': {
    reason:
      'Purchase answers 422 also with its own merchant (unpooled A/B 2026-10-19); develop tags it ' +
      '@fixme_preprod (docs section 4.19).',
    rejectedOn: '2026-10-19',
    revisit: 'When it passes on its own: rerun its Cybersource PE vault canary.',
  },
  'PI-T1955': {
    reason:
      'Times out (240s) also with its own merchant: 2 of 4 runs unpooled, 3 of 4 in the ' +
      'KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX canaries (docs section 4.19).',
    rejectedOn: '2026-10-19',
    revisit: 'When it passes on its own: rerun the KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX canary.',
  },
  'PAYM-T2180': {
    reason:
      'Expects DP-7101 for an incomplete card and gets DP-4303 also with its own merchant: 3 of 5 ' +
      'runs unpooled, every run in both canary modes (docs section 4.17).',
    rejectedOn: '2026-10-19',
    revisit: 'When it passes on its own: rerun the BAZ_PROCESSOR_AUTHORIZE_MX canary.',
  },
};

export function findRejectedSpec(file: string): RejectedSpec | undefined {
  return REJECTED_SPECS[
    file
      .split('/')
      .pop()!
      .replace(/\.spec\.ts$/, '')
  ];
}
