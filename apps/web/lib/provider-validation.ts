/** Expected data failures only. Call sites supply fixed messages, never provider text. */
export class ProviderValidationError extends Error {
 constructor(message='Invalid provider evidence.'){super(message);this.name='ProviderValidationError';}
}
/** Only fetch/body I/O boundaries construct transport errors; never parser wrappers. */
export class ProviderTransportError extends Error {
 constructor(readonly category:'NETWORK'|'TIMEOUT'|'UNKNOWN'){super('Market transport unavailable.');this.name='ProviderTransportError';}
}
