// The Creator UI keeps this forwarding module so its existing imports remain
// stable. The protocol contract itself belongs to @box-local/cli, which is
// also consumed by Creator HTTP adapters and external CLI clients.
export {
  CREATOR_CAPABILITIES,
  CREATOR_CAPABILITY_META,
  FULL_CREATOR_CAPABILITIES,
  hasCreatorCapability,
  normalizeCreatorCapabilities,
} from '@box-local/cli';
export type { CreatorCapability } from '@box-local/cli';
