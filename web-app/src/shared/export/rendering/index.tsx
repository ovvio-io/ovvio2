import { RichtextRenderer } from './richtext-renderer';
import TaskRenderer from './task-renderer';
import AssigneeRenderer from './assignee-renderer';
import LineRenderer from './line-renderer';
import TitleRenderer from './title-renderer';
import HeadersRenderer from './headers-renderer';
import ListsRenderer from './lists-renderer';

const noteBodyRenderer = new RichtextRenderer([
  new TaskRenderer(),
  new AssigneeRenderer(),
  new HeadersRenderer(),
  new ListsRenderer(),
  new LineRenderer(),
]);

const noteTitleRenderer = new RichtextRenderer([
  new TitleRenderer(),
  new AssigneeRenderer(),
]);

export { RichtextRenderer, noteBodyRenderer, noteTitleRenderer };
