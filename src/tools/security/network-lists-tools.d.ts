import { type MCPToolResponse } from '../../types';
export declare function listNetworkLists(customer?: string, options?: {
    type?: 'IP' | 'GEO' | 'ASN';
    search?: string;
    includeElements?: boolean;
    extended?: boolean;
}): Promise<MCPToolResponse>;
export declare function getNetworkList(uniqueId: string, customer?: string, options?: {
    includeElements?: boolean;
    extended?: boolean;
}): Promise<MCPToolResponse>;
export declare function createNetworkList(name: string, type: 'IP' | 'GEO' | 'ASN', elements: string[], customer?: string, options?: {
    description?: string;
    contractId?: string;
    groupId?: string;
}): Promise<MCPToolResponse>;
export declare function updateNetworkList(uniqueId: string, customer?: string, options?: {
    name?: string;
    description?: string;
    addElements?: string[];
    removeElements?: string[];
    replaceElements?: string[];
}): Promise<MCPToolResponse>;
export declare function deleteNetworkList(uniqueId: string, customer?: string): Promise<MCPToolResponse>;
//# sourceMappingURL=network-lists-tools.d.ts.map