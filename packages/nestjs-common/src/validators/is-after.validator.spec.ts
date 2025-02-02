import { validate } from 'class-validator';
import { IsAfterField } from './is-after.validator';

class TestClass {
  @IsAfterField('comparisonDate')
  date: string;

  comparisonDate: string;
}

describe('IsAfterField', () => {
  it('should validate that the date is after the comparison date', async () => {
    const instance = new TestClass();
    instance.date = '2023-10-10';
    instance.comparisonDate = '2023-10-01';

    const errors = await validate(instance);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if the date is before the comparison date', async () => {
    const instance = new TestClass();
    instance.date = '2023-09-30';
    instance.comparisonDate = '2023-10-01';

    const errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isAfterField');
  });

  it('should fail validation if the date is equal to the comparison date', async () => {
    const instance = new TestClass();
    instance.date = '2023-10-01';
    instance.comparisonDate = '2023-10-01';

    const errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isAfterField');
  });

  it('should fail validation if the date is invalid', async () => {
    const instance = new TestClass();
    instance.date = 'invalid-date';
    instance.comparisonDate = '2023-10-01';

    const errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isAfterField');
  });

  it('should fail validation if the comparison date is invalid', async () => {
    const instance = new TestClass();
    instance.date = '2023-10-10';
    instance.comparisonDate = 'invalid-date';

    const errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isAfterField');
  });

  it('should fail validation if either date or comparison date is missing', async () => {
    const instance = new TestClass();
    instance.date = '';
    instance.comparisonDate = '2023-10-01';

    let errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isAfterField');

    instance.date = '2023-10-10';
    instance.comparisonDate = '';

    errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isAfterField');
  });
});
