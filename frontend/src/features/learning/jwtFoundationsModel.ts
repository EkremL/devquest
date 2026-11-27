export const claims = { iss:'dispatch-lab', aud:'roster-api', sub:'operator-17', iat:20, nbf:60, exp:300 } as const
export type Algorithm = 'HS256' | 'RS256'
export type JwtCase = {
  algorithm: Algorithm; configured: Algorithm; verified: boolean; now: number; issuer: string; audience: string;
}

export function checkJwt(input: JwtCase) {
  if (input.algorithm !== input.configured) return 'Algorithm not allowed by verifier'
  if (!input.verified) return 'Signature check failed'
  if (input.issuer !== claims.iss) return 'Issuer mismatch'
  if (input.audience !== claims.aud) return 'Audience mismatch'
  if (input.now < claims.nbf) return 'Not active yet'
  if (input.now >= claims.exp) return 'Expired at verifier'
  return 'Eligible for authorization'
}
export const jwtBaseline: JwtCase = {
  algorithm:'RS256', configured:'RS256', verified:true, now:60, issuer:claims.iss, audience:claims.aud,
}
