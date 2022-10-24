import { Descendant } from 'slate';
import { ReactEditor } from 'slate-react';
import { createStaticEditor } from '../utils';
import { ListUtils } from './list-utils';

describe('ListUtils', () => {
  describe('liftListItem', () => {
    describe('Non nested', () => {
      it("When single list item, moves to root editor as p and deletes the container", () => {
        const value: Descendant[] = [{
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'My List Item'
            }]
          }]
        }];

        const editor = createStaticEditor(value);
        const textPath = [0, 0, 0];

        ListUtils.liftListItem(editor, textPath);

        const newValue = editor.children;

        expect(newValue).toEqual([{
          tagName: 'p',
          children: [{
            text: 'My List Item'
          }]
        }] as Descendant[]);
      });
      it(" When list item is first child of non-nested list container, moves list item before the list and keeps the list intact", () => {
        const value: Descendant[] = [{
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'Bullet One'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Two'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Three'
            }]
          }]
        }];

        const editor = createStaticEditor(value);
        const textPath = [0, 0, 0];

        ListUtils.liftListItem(editor, textPath);

        const newValue = editor.children;

        expect(newValue).toEqual([{
          tagName: 'p',
          children: [{
            text: 'Bullet One'
          }]
        }, {
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'Bullet Two'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Three'
            }]
          }]
        }] as Descendant[]);
      });
      it("When list item is last child of non-nested list container, moves list item after the list and keeps the list intact", () => {
        const value: Descendant[] = [{
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'Bullet One'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Two'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Three'
            }]
          }]
        }];

        const editor = createStaticEditor(value);
        const textPath = [0, 2, 0];

        ListUtils.liftListItem(editor, textPath);

        const newValue = editor.children;

        expect(newValue).toEqual([{
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'Bullet One'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Two'
            }]
          }]
        }, {
          tagName: 'p',
          children: [{
            text: 'Bullet Three'
          }]
        }] as Descendant[]);
      });
      it("When list item is in middle of non-nested list container, splits the list and moves the list item in between", () => {
        const value: Descendant[] = [{
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'Bullet One'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Two'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Three'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Four'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Five'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Six'
            }]
          }]
        }];

        const editor = createStaticEditor(value);
        const textPath = [0, 3, 0];

        ListUtils.liftListItem(editor, textPath);

        const newValue = editor.children;

        expect(newValue).toEqual([{
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'Bullet One'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Two'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Three'
            }]
          }]
        }, {
          tagName: 'p',
          children: [{
            text: 'Bullet Four'
          }]
        }, {
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'Bullet Five'
            }]
          }, {
            tagName: 'li',
            children: [{
              text: 'Bullet Six'
            }]
          }]
        }] as Descendant[]);
      });
    });
    describe('Nested List', () => {
      it("When single list item, moves to upper list and deletes the container", () => {
        const value: Descendant[] = [{
          tagName: 'ul',
          children: [{
            tagName: 'ol',
            children: [{
              tagName: 'li',
              children: [{
                text: 'My List Item'
              }]
            }]
          }]
        }];

        const editor = createStaticEditor(value);
        const textPath = [0, 0, 0, 0];

        ListUtils.liftListItem(editor, textPath);

        const newValue = editor.children;

        expect(newValue).toEqual([{
          tagName: 'ul',
          children: [{
            tagName: 'li',
            children: [{
              text: 'My List Item'
            }]
          }]
        }] as Descendant[]);
      });
    });
  });
});
