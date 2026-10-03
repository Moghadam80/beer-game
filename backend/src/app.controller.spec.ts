import { describe, expect, it } from 'vitest';
import { AppService } from './app.service.js';

describe('health service', () => {
  it('reports an available backend', () => {
    expect(new AppService().getHealth()).toEqual({ status: 'ok' });
  });
});
