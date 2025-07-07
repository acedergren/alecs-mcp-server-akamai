import { type MCPToolResponse, type NetworkListBulkUpdate } from '../../types';
export declare function importNetworkListFromCSV(uniqueId: string, csvContent: string, customer?: string, options?: {
    operation?: 'replace' | 'append' | 'remove';
    validateElements?: boolean;
    skipInvalid?: boolean;
    dryRun?: boolean;
}): Promise<MCPToolResponse>;
export declare function exportNetworkListToCSV(uniqueId: string, customer?: string, options?: {
    includeHeaders?: boolean;
    includeMetadata?: boolean;
}): Promise<MCPToolResponse>;
export declare function bulkUpdateNetworkLists(updates: NetworkListBulkUpdate[], customer?: string, options?: {
    validateElements?: boolean;
    skipInvalid?: boolean;
    continueOnError?: boolean;
}): Promise<MCPToolResponse>;
export declare function mergeNetworkLists(sourceListIds: string[], targetListId: string, customer?: string, options?: {
    operation?: 'union' | 'intersection' | 'difference';
    removeDuplicates?: boolean;
    deleteSourceLists?: boolean;
}): Promise<MCPToolResponse>;
//# sourceMappingURL=network-lists-bulk.d.ts.map