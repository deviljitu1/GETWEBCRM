import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  console.error(JSON.stringify({
    event: 'crm_request_error',
    route: context.routePath,
    routeType: context.routeType,
    method: request.method,
    name: error instanceof Error ? error.name : 'UnknownError',
    digest: typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : undefined,
  }));
};
