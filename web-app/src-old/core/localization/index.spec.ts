import { format } from './index.tsx';

describe('localization', () => {
  describe('format', () => {
    describe('single variable', () => {
      it('Returns string with replaced variable when given a string with a single variable at the end of the sentence', () => {
        const formatted = format('My name is {name}', { name: 'Yossi' });

        expect(formatted).toEqual('My name is Yossi');
      });

      it('Returns string with replaced variable when given a string with a single variable at the middle of the sentence', () => {
        const formatted = format('I love eating {food} for dinner', {
          food: 'hamburgers',
        });

        expect(formatted).toEqual('I love eating hamburgers for dinner');
      });

      it('Returns string with replaced variable when given a string with a single variable at the start of the sentence', () => {
        const formatted = format('{fruit} is good for you', { fruit: 'Mango' });

        expect(formatted).toEqual('Mango is good for you');
      });

      it('Returns string with replaced variable when given a string with a single repeating variable at the start of the sentence', () => {
        const formatted = format(
          '{fruit} is good for you, I love {fruit}, who doesnt love {fruit}',
          { fruit: 'Mango' }
        );

        expect(formatted).toEqual(
          'Mango is good for you, I love Mango, who doesnt love Mango'
        );
      });
    });
  });
});
