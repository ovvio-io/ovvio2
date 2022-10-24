import { Note, User } from '@ovvio/cfds/lib/client/graph/vertices';

export function assignNote(card: Note, user: User, insteadOf?: User) {
  const assignees = card.assignees;
  assignees.add(user);
  if (insteadOf) {
    assignees.delete(insteadOf);
  }
  card.assignees = assignees;
}
