import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileManager from '../pages/FileManager';
import { api } from '../services/api';

// Mock the api service
vi.mock('../services/api');

describe('FileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load files on mount', async () => {
    const mockFiles = [
      { _id: '1', name: 'test.txt', size: 1000 },
      { _id: '2', name: 'image.jpg', size: 2000 }
    ];

    // Mock the API response
    api.get.mockResolvedValueOnce({ data: mockFiles });

    render(<FileManager />);

    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
    });
  });

  it('should handle file upload', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    api.post.mockResolvedValueOnce({ data: { _id: '3', name: 'test.txt' } });
    api.get.mockResolvedValueOnce({ data: [{ _id: '3', name: 'test.txt' }] });

    render(<FileManager />);

    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/files/upload', expect.any(FormData));
    });
  });

  it('should handle file deletion', async () => {
    const mockFiles = [{ _id: '1', name: 'test.txt' }];
    api.get.mockResolvedValueOnce({ data: mockFiles });
    api.delete.mockResolvedValueOnce({});
    api.get.mockResolvedValueOnce({ data: [] });

    render(<FileManager />);

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/files/1');
    });
  });
}); 