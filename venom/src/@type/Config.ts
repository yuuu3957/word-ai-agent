export interface Config {
  extension_server: {
    port: number;
  };
  backend_server: {
    port: number;
    hubName: string;
  };
}
