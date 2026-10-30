import { generateSync } from 'otplib';

export function generateOTPCode(secret: string): string {
  const otpCode = generateSync({ secret });
  console.log(`Generated TOTP code for MFA: ${otpCode}`);
  return otpCode;
}
