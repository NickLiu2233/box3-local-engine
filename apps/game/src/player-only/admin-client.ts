/** Player builds do not expose administrator or editor controls. */
export class GameAdminClient {
  constructor(_spec: Record<string, unknown>) {}

  public init() {}
}
