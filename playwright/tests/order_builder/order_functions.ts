import { validate } from 'uuid';

export function generatePNR(): string {
  const charsA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let codeA = '';
  for (let i = 0; i < 3; i++) {
    codeA += charsA.charAt(Math.floor(Math.random() * charsA.length));
  }

  const charsN = '0123456789';
  let codeN = '';
  for (let i = 0; i < 3; i++) {
    codeN += charsN.charAt(Math.floor(Math.random() * charsN.length));
  }

  return `${codeA}${codeN}`;
}

export function generateTicketNumber(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomNumber(lenght: number): number {
  if (lenght <= 0) {
    throw new Error('Length must be a positive integer.');
  }

  // Calculate the minimum and maximum values for an n-digit number
  const min = Math.pow(10, lenght - 1);
  const max = Math.pow(10, lenght) - 1;

  // Generate a random number within this range
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function validateUUID(uuid: string): boolean {
  const validFormat = validate(uuid);
  const notEmpty = uuid !== '00000000-0000-0000-0000-000000000000';
  return validFormat && notEmpty;
}
