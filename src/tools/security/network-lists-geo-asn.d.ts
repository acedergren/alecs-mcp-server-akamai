import { type MCPToolResponse } from '../../types';
export declare function validateGeographicCodes(codes: string[], _customer?: string): Promise<MCPToolResponse>;
export declare function getASNInformation(asns: string[], _customer?: string): Promise<MCPToolResponse>;
export declare function generateGeographicBlockingRecommendations(_customer?: string, options?: {
    purpose?: 'compliance' | 'security' | 'licensing' | 'performance';
    allowedRegions?: string[];
    blockedRegions?: string[];
}): Promise<MCPToolResponse>;
export declare function generateASNSecurityRecommendations(_customer?: string, options?: {
    includeCloudProviders?: boolean;
    includeVPNProviders?: boolean;
    includeResidentialISPs?: boolean;
    purpose?: 'bot-protection' | 'fraud-prevention' | 'compliance';
}): Promise<MCPToolResponse>;
export declare function listCommonGeographicCodes(): Promise<MCPToolResponse>;
//# sourceMappingURL=network-lists-geo-asn.d.ts.map