/**
 * Network Lists API Response Types
 * @see https://techdocs.akamai.com/network-lists/reference/api
 */

/**
 * Network list types
 */
export enum NetworkListType {
  IP = 'IP',
  GEO = 'GEO',
  EXCEPTION = 'EXCEPTION',
}

/**
 * Network list sync point status
 */
export enum SyncPointStatus {
  ACTIVE_IN_STAGING = 'ACTIVE_IN_STAGING',
  ACTIVE_IN_PRODUCTION = 'ACTIVE_IN_PRODUCTION',
  INACTIVE = 'INACTIVE',
  MODIFIED = 'MODIFIED',
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
}

/**
 * Network list object
 */
export interface NetworkList {
  uniqueId: string;
  name: string;
  type: NetworkListType;
  description?: string;
  list?: string[]; // IP addresses or geo codes
  listType?: string;
  readOnly: boolean;
  shared?: boolean;
  syncPoint: number;
  accessControlGroup?: string;
  contractId?: string;
  groupId?: number;
  elementCount: number;
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
  stagingActivationStatus?: SyncPointStatus;
  productionActivationStatus?: SyncPointStatus;
  links?: {
    activateInProduction?: string;
    activateInStaging?: string;
    appendItems?: string;
    retrieve?: string;
    statusInProduction?: string;
    statusInStaging?: string;
    update?: string;
  };
}

/**
 * Response from /network-list/v2/network-lists
 */
export interface NetworkListsResponse {
  networkLists: NetworkList[];
  links?: {
    create?: string;
  };
}

/**
 * Response from GET /network-list/v2/network-lists/{networkListId}
 */
export interface NetworkListResponse extends NetworkList {
  account?: string;
  activationComments?: string;
  networkListType?: string;
}

/**
 * Response from POST/PUT /network-list/v2/network-lists/{networkListId}
 */
export interface NetworkListUpdateResponse {
  status: number;
  uniqueId: string;
  syncPoint: number;
  message?: string;
}

/**
 * Network list element for detailed operations
 */
export interface NetworkListElement {
  value: string;
  listId?: string;
  createdBy?: string;
  createDate?: string;
  expiryDate?: string;
}

/**
 * Response from /network-list/v2/network-lists/{networkListId}/elements
 */
export interface NetworkListElementsResponse {
  networkListId: string;
  elements: NetworkListElement[];
}

/**
 * Activation request
 */
export interface ActivationRequest {
  activate: boolean;
  network: 'STAGING' | 'PRODUCTION';
  notificationRecipients?: string[];
  comment?: string;
  fast?: boolean;
}

/**
 * Activation status
 */
export interface NetworkListActivationStatus {
  activationId: string;
  networkListId: string;
  network: 'STAGING' | 'PRODUCTION';
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'DEACTIVATED' | 'PENDING_DEACTIVATION';
  syncPoint: number;
  createdDate: string;
  createdBy: string;
  comment?: string;
  fast?: boolean;
}

/**
 * Response from POST /network-list/v2/network-lists/{networkListId}/environments/{environment}/activate
 */
export interface ActivationResponse {
  activationId: string;
  activationStatus: 'PENDING_ACTIVATION';
  syncPoint: number;
  uniqueId: string;
  links?: {
    activationDetails?: string;
  };
}

/**
 * Response from GET /network-list/v2/network-lists/{networkListId}/environments/{environment}/status
 */
export interface ActivationStatusResponse extends NetworkListActivationStatus {
  activationComments?: string;
  activationDate?: string;
  estimatedActivationTime?: string;
}

/**
 * Response from /network-list/v2/network-lists/{networkListId}/history
 */
export interface NetworkListHistoryResponse {
  items: Array<{
    uniqueId: string;
    syncPoint: number;
    name: string;
    type: NetworkListType;
    elementCount: number;
    createdBy: string;
    createDate: string;
    updatedBy?: string;
    updateDate?: string;
    notes?: string;
  }>;
}

/**
 * Diff response for comparing versions
 */
export interface NetworkListDiffResponse {
  uniqueId: string;
  fromSyncPoint: number;
  toSyncPoint: number;
  added: string[];
  removed: string[];
}