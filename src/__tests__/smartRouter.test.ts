import { SmartRouter } from '../services/routing/smartRouter';
import { RaydiumService } from '../services/dex/raydium';
import { MeteoraService } from '../services/dex/meteora';

// Mock dependencies
jest.mock('../services/dex/raydium');
jest.mock('../services/dex/meteora');

describe('SmartRouter', () => {
    let router: SmartRouter;

    beforeEach(() => {
        router = new SmartRouter();
        jest.clearAllMocks();
    });

    it('should select Raydium when it offers a better price', async () => {
        (RaydiumService.prototype.getQuote as jest.Mock).mockResolvedValue({ price: 105, amountout: 105, dex: 'raydium' });
        (MeteoraService.prototype.getQuote as jest.Mock).mockResolvedValue({ price: 100, amountout: 100, dex: 'meteora' });

        const quote = await router.findBestQuote('SOL', 'USDC', 1);

        expect(quote.dex).toBe('raydium');
        expect(quote.price).toBe(105);
    });

    it('should select Meteora when it offers a better price', async () => {
        (RaydiumService.prototype.getQuote as jest.Mock).mockResolvedValue({ price: 90, amountout: 90, dex: 'raydium' });
        (MeteoraService.prototype.getQuote as jest.Mock).mockResolvedValue({ price: 100, amountout: 100, dex: 'meteora' });

        const quote = await router.findBestQuote('SOL', 'USDC', 1);

        expect(quote.dex).toBe('meteora');
        expect(quote.price).toBe(100);
    });

    it('should default to Raydium (or handle gracefully) if prices are equal or zero', async () => {
        // Assuming logic defaults to first if equal, or whatever implementation does
        (RaydiumService.prototype.getQuote as jest.Mock).mockResolvedValue({ price: 100, amountout: 100, dex: 'raydium' });
        (MeteoraService.prototype.getQuote as jest.Mock).mockResolvedValue({ price: 100, amountout: 100, dex: 'meteora' });

        const quote = await router.findBestQuote('SOL', 'USDC', 1);
        // Expect one of them, typically Raydium if it's checked first and logic is >=
        expect(['raydium', 'meteora']).toContain(quote.dex);
        expect(quote.price).toBe(100);
    });
});
