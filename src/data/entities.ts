// Certified Entities Mock Data and Data Source
// VeritasChain Standards Organization (VSO)

import { CertifiedEntity } from '../types';

export const mockCertifiedEntities: CertifiedEntity[] = [
  {
    name: 'Alpha Quant Exchange',
    type: 'EXCHANGE',
    tier: 'PLATINUM',
    status: 'COMPLIANT',
    verification_url: 'https://explorer.veritaschain.org/entities/alpha-quant',
    audit_report: '2025-Q3'
  },
  {
    name: 'Omega Markets',
    type: 'PROP_FIRM',
    tier: 'SILVER',
    status: 'REVOKED',
    verification_url: 'https://explorer.veritaschain.org/entities/omega-markets',
    audit_report: '2025-Q2'
  },
  {
    name: 'Velocity Trading LLC',
    type: 'PROP_FIRM',
    tier: 'GOLD',
    status: 'COMPLIANT',
    verification_url: 'https://explorer.veritaschain.org/entities/velocity-trading',
    audit_report: '2025-Q3'
  },
  {
    name: 'Nexus Global Brokers',
    type: 'BROKER',
    tier: 'GOLD',
    status: 'PENDING',
    verification_url: 'https://explorer.veritaschain.org/entities/nexus-global',
    audit_report: '2025-Q4'
  },
  {
    name: 'Quantum Asset Management',
    type: 'FUND',
    tier: 'PLATINUM',
    status: 'COMPLIANT',
    verification_url: 'https://explorer.veritaschain.org/entities/quantum-asset',
    audit_report: '2025-Q3'
  },
  {
    name: 'Sentinel Trading Systems',
    type: 'EXCHANGE',
    tier: 'GOLD',
    status: 'COMPLIANT',
    verification_url: 'https://explorer.veritaschain.org/entities/sentinel-trading',
    audit_report: '2025-Q3'
  },
  {
    name: 'Phoenix Capital Partners',
    type: 'FUND',
    tier: 'SILVER',
    status: 'SUSPENDED',
    verification_url: 'https://explorer.veritaschain.org/entities/phoenix-capital',
    audit_report: '2025-Q1'
  }
];

/**
 * Data Source Layer for Certified Entities
 * 将来的にデータベースに置き換え可能
 */
export class EntitiesDataSource {
  /**
   * VC-Certified取得企業の一覧を取得
   */
  async getCertifiedEntities(): Promise<CertifiedEntity[]> {
    // 将来: SELECT * FROM certified_entities ORDER BY name
    return mockCertifiedEntities;
  }

  /**
   * 特定のステータスでフィルタリング（将来の拡張用）
   */
  async getEntitiesByStatus(status: string): Promise<CertifiedEntity[]> {
    // 将来: SELECT * FROM certified_entities WHERE status = ?
    return mockCertifiedEntities.filter(e => e.status === status);
  }

  /**
   * 特定のティアでフィルタリング（将来の拡張用）
   */
  async getEntitiesByTier(tier: string): Promise<CertifiedEntity[]> {
    // 将来: SELECT * FROM certified_entities WHERE tier = ?
    return mockCertifiedEntities.filter(e => e.tier === tier);
  }
}
