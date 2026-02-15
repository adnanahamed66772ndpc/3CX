declare module 'asterisk-ami-client' {
  interface AmiClientOptions {
    reconnect?: boolean;
    keepAlive?: boolean;
    emitEventsByTypes?: boolean;
    emitResponsesById?: boolean;
  }
  class AmiClient {
    constructor(options?: AmiClientOptions);
    connect(user: string, secret: string, options: { host: string; port: number }): Promise<void>;
    on(event: string, cb: (data: unknown) => void): this;
    action(action: Record<string, unknown>, callback?: boolean): Promise<unknown>;
  }
  export = AmiClient;
}
