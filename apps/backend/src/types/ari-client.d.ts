declare module 'ari-client' {
  interface Channel {
    id: string;
    name?: string;
    state?: string;
    answer?: () => Promise<void>;
  }
  interface ConnectOptions {
    [key: string]: unknown;
  }
  function connect(
    url: string,
    username: string,
    password: string
  ): Promise<{
    on: (event: string, cb: (...args: unknown[]) => void | Promise<void>) => void;
    start: (app: string) => void;
    channels: {
      originate: (opts: Record<string, unknown>) => Promise<unknown>;
      hangup: (opts: { channelId: string }) => Promise<unknown>;
      play: (opts: { channelId: string; media: string }, playback: unknown) => Promise<unknown>;
    };
    bridges: {
      create: (opts: { type: string }) => Promise<{ id: string }>;
      addChannel: (opts: { bridgeId: string; channel: string }) => Promise<unknown>;
    };
    Playback: () => { id: string; on: (event: string, cb: () => void) => void };
  }>;
  export = connect;
}
