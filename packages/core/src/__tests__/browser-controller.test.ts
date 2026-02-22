import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserController } from '../browser/controller.js';

// Mock playwright
vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn(),
    },
    firefox: {
        launch: vi.fn(),
    },
    webkit: {
        launch: vi.fn(),
    },
}));

describe('BrowserController Navigation & Waits', () => {
    let controller: BrowserController;
    let mockPage: any;
    let mockContext: any;
    let mockBrowser: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup mock page with all required methods
        mockPage = {
            goto: vi.fn().mockResolvedValue(true),
            goBack: vi.fn().mockResolvedValue(true),
            waitForLoadState: vi.fn().mockResolvedValue(true),
            click: vi.fn().mockResolvedValue(true),
            fill: vi.fn().mockResolvedValue(true),
            hover: vi.fn().mockResolvedValue(true),
            selectOption: vi.fn().mockResolvedValue(true),
            on: vi.fn(),
            url: vi.fn().mockReturnValue('http://localhost'),
            title: vi.fn().mockResolvedValue('Test Title'),
            mouse: {
                click: vi.fn().mockResolvedValue(true),
                wheel: vi.fn().mockResolvedValue(true),
                move: vi.fn().mockResolvedValue(true),
            },
            keyboard: {
                type: vi.fn().mockResolvedValue(true),
            },
            locator: vi.fn().mockReturnValue({
                click: vi.fn().mockResolvedValue(true),
                fill: vi.fn().mockResolvedValue(true),
                hover: vi.fn().mockResolvedValue(true),
                first: vi.fn().mockReturnThis(),
            }),
        };

        mockContext = {
            newPage: vi.fn().mockResolvedValue(mockPage),
            close: vi.fn().mockResolvedValue(true),
        };

        mockBrowser = {
            newContext: vi.fn().mockResolvedValue(mockContext),
            close: vi.fn().mockResolvedValue(true),
        };

        // Override the playwright mock to return our constructed mock implementation
        const playwright = require('playwright');
        playwright.chromium.launch.mockResolvedValue(mockBrowser);

        controller = new BrowserController();
    });

    it('should use networkidle constraint on navigate', async () => {
        await controller.launch();

        await controller.navigate('https://test.local');

        expect(mockPage.goto).toHaveBeenCalledWith('https://test.local', { waitUntil: 'networkidle' });
    });

    it('should use networkidle constraint on goBack', async () => {
        await controller.launch();

        await controller.goBack();

        expect(mockPage.goBack).toHaveBeenCalledWith({ waitUntil: 'networkidle' });
    });

    it('should wait for networkidle after click', async () => {
        await controller.launch();

        await controller.click('#my-button');

        expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 3000 });
    });

    it('should wait for networkidle after clickByCoordinate', async () => {
        await controller.launch();

        await controller.clickByCoordinate(100, 200);

        expect(mockPage.mouse.click).toHaveBeenCalledWith(100, 200);
        expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 3000 });
    });

    it('should wait for networkidle after clickByRef', async () => {
        await controller.launch();

        // Register element to be found
        controller.registerElements([{
            ref: 'el_123',
            role: 'button',
            name: 'Click',
            backendNodeId: 1,
            bbox: { x: 0, y: 0, width: 200, height: 200, centerX: 100, centerY: 100 },
            state: { focused: false, disabled: false },
        }]);

        await controller.clickByRef('el_123');

        expect(mockPage.mouse.click).toHaveBeenCalledWith(100, 100);
        expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 3000 });
    });
});
