/**
 * Authentication and Authorization Error Classes
 * Following RFC 7807 Problem Details standard
 */

import { AkamaiError } from '../utils/unified-error-handler';

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AkamaiError {
  constructor(message: string) {
    super({
      type: 'https://problems.luna.akamaiapis.net/auth/v1/unauthorized',
      title: 'Unauthorized',
      detail: message,
      status: 401,
      errors: [{
        type: 'unauthorized',
        title: 'Authentication Required',
        detail: 'Please provide valid authentication credentials'
      }]
    });
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AkamaiError {
  constructor(message: string) {
    super({
      type: 'https://problems.luna.akamaiapis.net/auth/v1/forbidden',
      title: 'Forbidden',
      detail: message,
      status: 403,
      errors: [{
        type: 'forbidden',
        title: 'Access Denied',
        detail: 'You do not have permission to access this resource'
      }]
    });
    this.name = 'ForbiddenError';
  }
}

/**
 * Account switch error
 */
export class AccountSwitchError extends ForbiddenError {
  constructor(customer: string, reason?: string) {
    const message = `Cannot switch to customer account '${customer}'`;
    const response: unknown = {
      type: 'https://problems.luna.akamaiapis.net/auth/v1/account-switch-error',
      title: 'Account Switch Failed',
      detail: message,
      status: 403,
      errors: [{
        type: 'account_switch_failed',
        title: 'Account Switch Failed',
        detail: reason || 'Invalid or missing account switch key'
      }]
    };
    
    super(String(response));
    this.name = 'AccountSwitchError';
  }
}

/**
 * Invalid customer error
 */
export class InvalidCustomerError extends UnauthorizedError {
  constructor(customer: string) {
    const message = `Customer '${customer}' is not valid`;
    const response: unknown = {
      type: 'https://problems.luna.akamaiapis.net/auth/v1/invalid-customer',
      title: 'Invalid Customer',
      detail: message,
      status: 401,
      errors: [{
        type: 'invalid_customer',
        title: 'Invalid Customer',
        detail: 'The specified customer does not exist or is not configured'
      }]
    };
    
    super(String(response));
    this.name = 'InvalidCustomerError';
  }
}