declare module 'sightengine' {
  interface SightengineClient {
    check(models: string[]): SightengineClient;
    set_url(url: string): Promise<any>;
    set_file(path: string): Promise<any>;
  }

  function sightengine(apiUser: string, apiSecret: string): SightengineClient;
  
  export = sightengine;
}
