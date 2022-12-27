import { Note, User } from '../../../../cfds/client/graph/vertices/index.ts';
import { UISource } from '../../../../logging/client-events.ts';
import { Logger } from '../../../../logging/log.ts';

export function assignNote(
  logger: Logger,
  source: UISource,
  card: Note,
  user: User,
  insteadOf?: User
) {
  const assignees = card.assignees;
  assignees.add(user);
  if (insteadOf && insteadOf !== user) {
    assignees.delete(insteadOf);
    logger.log({
      severity: 'INFO',
      event: 'AssigneeReplaced',
      vertex: card.key,
      user: user.key,
      prevUser: insteadOf.key,
      uiSource: source,
    });
  } else {
    logger.log({
      severity: 'INFO',
      event: 'AssigneeAdded',
      vertex: card.key,
      user: user.key,
      uiSource: source,
    });
  }
  // card.assignees = assignees;
}
