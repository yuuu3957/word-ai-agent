import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Router } from '../renderer/router';

describe('App', () => {
  it('should render', () => {
    expect(render(<Router />)).toBeTruthy();
  });
});
