import { type MCPToolResponse } from '../../types';
export declare function activateNetworkList(uniqueId: string, network: 'STAGING' | 'PRODUCTION', customer?: string, options?: {
    comments?: string;
    notificationEmails?: string[];
    fast?: boolean;
}): Promise<MCPToolResponse>;
export declare function getNetworkListActivationStatus(activationId: string, customer?: string): Promise<MCPToolResponse>;
export declare function listNetworkListActivations(customer?: string, options?: {
    listType?: 'IP' | 'GEO' | 'ASN';
    network?: 'STAGING' | 'PRODUCTION';
    status?: 'PENDING' | 'ACTIVE' | 'FAILED' | 'INACTIVE';
}): Promise<MCPToolResponse>;
export declare function deactivateNetworkList(uniqueId: string, network: 'STAGING' | 'PRODUCTION', customer?: string, options?: {
    comments?: string;
}): Promise<MCPToolResponse>;
export declare function bulkActivateNetworkLists(activations: Array<{
    uniqueId: string;
    network: 'STAGING' | 'PRODUCTION';
}>, customer?: string, options?: {
    comments?: string;
    notificationEmails?: string[];
    waitForCompletion?: boolean;
    maxWaitTime?: number;
}): Promise<MCPToolResponse>;
//# sourceMappingURL=network-lists-activation.d.ts.map