const fs = require('fs').promises;
const fileService = require('../../../services/file.service');

jest.mock('fs', () => ({
    promises: {
        mkdir: jest.fn(),
        writeFile: jest.fn(),
        unlink: jest.fn(),
        readFile: jest.fn()
    }
}));

describe('File Service Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should create upload directory if it does not exist', async () => {
            fs.mkdir.mockResolvedValue();
            await fileService.init();
            expect(fs.mkdir).toHaveBeenCalled();
        });

        it('should handle directory creation errors', async () => {
            const error = new Error('Permission denied');
            fs.mkdir.mockRejectedValue(error);
            await expect(fileService.init()).rejects.toThrow('Permission denied');
        });
    });
});