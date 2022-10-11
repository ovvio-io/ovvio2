import { Utils } from '@ovvio/base';
import { CoreValue, coreValueClone } from '../../core-types';

// A tuple of [fieldName, local, oldValue]
export type Mutation = [fieldname: string, local: boolean, value: CoreValue];

export type MutationPack = Mutation | Mutation[] | undefined | void;

function isMutation(pack: MutationPack): pack is Mutation {
  return (
    pack instanceof Array && pack.length === 3 && typeof pack[0] === 'string'
  );
}

export function mutationPackAppend(
  pack: MutationPack,
  mutation: MutationPack
): MutationPack {
  // NOP
  if (mutation === undefined) {
    return pack;
  }
  if (pack === undefined) {
    return mutation;
  }
  // Both pack and mutation are not empty. Must allocate an array
  if (isMutation(pack)) {
    pack = [pack];
  }
  // Append the added mutations
  if (isMutation(mutation)) {
    pack.push(mutation);
  } else {
    Utils.Array.append(pack, mutation);
  }
  return mutationPackOptimize(pack);
}

export function* mutationPackIter(pack: MutationPack): Generator<Mutation> {
  if (pack === undefined) {
    return;
  }
  if (isMutation(pack)) {
    yield pack;
  } else {
    for (const m of pack) {
      yield m;
    }
  }
}

export function mutationPackGetFirst(pack: MutationPack): Mutation | undefined {
  if (pack === undefined) {
    return undefined;
  }
  if (isMutation(pack)) {
    return pack;
  }
  return pack[0];
}

export function mutationPackLength(pack: MutationPack): number {
  if (pack === undefined) {
    return 0;
  }
  if (isMutation(pack)) {
    return 1;
  }
  return pack.length;
}

export function mutationPackGet(
  pack: MutationPack,
  idx: number
): Mutation | undefined {
  if (pack === undefined) {
    return undefined;
  }
  if (isMutation(pack)) {
    return idx === 0 ? pack : undefined;
  }
  return pack[idx];
}

export function mutationPackDeleteFirst(pack: MutationPack): MutationPack {
  if (pack === undefined || isMutation(pack) || pack.length <= 1) {
    return undefined;
  }
  pack.shift();
  return pack;
}

export function mutationPackToArr(pack: MutationPack): Mutation[] {
  if (pack === undefined) {
    return [];
  }
  if (isMutation(pack)) {
    return [pack];
  }
  return pack;
}

export function mutationPackIsEmpty(pack: MutationPack): boolean {
  return pack === undefined || pack.length === 0;
}

/**
 * Removes duplicate mutations for the same field.
 *
 * @param pack The pack to optimize.
 * @returns An optimized pack where each field appears only once.
 */
export function mutationPackOptimize(pack: MutationPack): MutationPack {
  if (pack === undefined || isMutation(pack) || pack.length <= 1) {
    return pack;
  }

  const seenFields: string[] = [];
  for (let i = 0; i < pack.length; ++i) {
    const [fieldName] = pack[i];
    if (seenFields.indexOf(fieldName) > -1) {
      pack.splice(i, 1);
      --i;
    } else {
      seenFields.push(fieldName);
    }
  }
  return pack;
}

export function mutationPackClone(pack: MutationPack): MutationPack {
  if (!pack) {
    return undefined;
  }
  if (isMutation(pack)) {
    return [pack[0], pack[1], pack[2]];
  }
  return (pack as Mutation[]).map(m => [m[0], m[1], m[2]] as Mutation);
}

export function mutationPackHasRemote(pack: MutationPack): boolean {
  if (pack !== undefined) {
    if (isMutation(pack)) {
      return pack[1] === false;
    }
    for (const [_f, local] of pack) {
      if (!local) {
        return true;
      }
    }
  }
  return false;
}

export function mutationPackHasField(
  pack: MutationPack,
  ...fields: string[]
): boolean {
  for (const [field] of mutationPackIter(pack)) {
    if (fields.includes(field)) {
      return true;
    }
  }
  return false;
}

export function mutationPackIsLocal(pack: MutationPack): boolean {
  for (const m of mutationPackIter(pack)) {
    if (!m[1]) {
      return false;
    }
  }
  return true;
}

export function mutationPackDeleteField(
  pack: MutationPack,
  fieldName: string
): MutationPack {
  if (pack === undefined) {
    return undefined;
  }
  if (isMutation(pack) && pack[0] === fieldName) {
    return undefined;
  }
  if (pack.length === 1 && pack[0][0] === fieldName) {
    return undefined;
  }
  for (let i = 0; i < pack.length; ++i) {
    if ((pack[i] as Mutation)[0] === fieldName) {
      pack.splice(i, 1);
      break;
    }
  }
  return pack.length > 0 ? pack : undefined;
}

export function mutationPackSubtractFields(
  pack: MutationPack,
  toRemoveField: MutationPack
): MutationPack {
  for (const m of mutationPackIter(toRemoveField)) {
    pack = mutationPackDeleteField(pack, m[0]);
  }
  return pack;
}
