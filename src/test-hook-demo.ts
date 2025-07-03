// Test file to demonstrate proper typing
// This follows CODE KAI principles

interface UserResponse {
  id: string;
  name: string;
  email: string;
}

interface DataResponse {
  items: unknown[];
  total: number;
}

export async function fetchUserData(userId: string): Promise<UserResponse> {
  // Proper typing with unknown and validation
  const response: unknown = await fetch(`/api/users/${userId}`);
  
  // In real code, you'd validate this properly
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response');
  }
  
  return response as UserResponse;
}

// Properly typed function
export function processApiResponse(response: DataResponse): unknown[] {
  return response.items;
}

// Using unknown with type guards
export async function getData(): Promise<DataResponse> {
  const result: unknown = await fetch('/api/data');
  
  // Validate response structure
  if (!result || typeof result !== 'object' || !('items' in result)) {
    throw new Error('Invalid data response');
  }
  
  return result as DataResponse;
}