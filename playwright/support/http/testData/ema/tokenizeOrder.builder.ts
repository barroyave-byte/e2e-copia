import { TokenizeOrderRequestData } from '@support/http/models/order';
import { TOKENIZE_ORDER_BODIES } from './tokenizeOrder.bodies';

/**
 * Available predefined body types for tokenizeOrder
 */
export type TokenizeOrderBodyType = keyof typeof TOKENIZE_ORDER_BODIES;

/**
 * Builder function to get predefined tokenizeOrder bodies
 * Test cases can use this to select which body they want without creating it manually
 *
 * @param bodyType - The type of predefined body to use
 * @returns The complete TokenizeOrderRequestData for the specified type
 */
export function getTokenizeOrderBody(bodyType: TokenizeOrderBodyType): TokenizeOrderRequestData {
  const body = TOKENIZE_ORDER_BODIES[bodyType];

  if (!body) {
    throw new Error(`Unknown tokenizeOrder body type: ${bodyType}`);
  }

  // Return a deep copy to avoid mutations affecting the original
  return JSON.parse(JSON.stringify(body));
}

/**
 * Get all available body types (useful for documentation or testing)
 */
export function getAvailableBodyTypes(): TokenizeOrderBodyType[] {
  return Object.keys(TOKENIZE_ORDER_BODIES) as TokenizeOrderBodyType[];
}
