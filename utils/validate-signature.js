import {
  createHmac,
  timingSafeEqual,
} from 'crypto';

const s2b = (str, encoding) => Buffer.from(str, encoding);

const safeCompare = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
};

const validateSignature = (
  body,
  secret,
  signature,
) => {
  if (!body || !secret || !signature) return false;
  return safeCompare(
    createHmac('SHA256', secret).update(body).digest(),
    s2b(signature, 'base64'),
  );
};

export default validateSignature;
