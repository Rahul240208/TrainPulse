import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debounce } from '../src/utils/debounce';

describe('debounce Utility (Milestone 12)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should delay invoking function until delayMs has elapsed', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('c');
  });

  it('should cancel pending execution when cancel() is called', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced('test');
    debounced.cancel();

    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();
  });
});
