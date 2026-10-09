import { assertInInjectionContext, inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

const returnUrlParam = 'returnUrl';

export function returnUrlQueryParams(url: string): Params {
  return url === '/' ? {} : { [returnUrlParam]: url };
}

export function injectReturnUrl(): string {
  assertInInjectionContext(injectReturnUrl);
  return inject(ActivatedRoute).snapshot.queryParamMap.get(returnUrlParam) ?? '/';
}
