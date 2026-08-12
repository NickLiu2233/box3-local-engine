import {
  ContactRecord,
  ContactRecordSchema,
} from '@box-local/schema/physics/physics-schema';
import { getById } from '@box-local/utils/id';

export function resolvePlayerAnimationContact(
  contacts: readonly ContactRecord[],
  id: number,
): ContactRecord {
  return getById(contacts, id) || ContactRecordSchema.identity;
}
