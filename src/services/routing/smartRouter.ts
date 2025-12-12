import { Quote, LiquidityProvider } from '../../interfaces';
import { RaydiumService } from '../dex/raydium';
import { MeteoraService } from '../dex/meteora';

export class SmartRouter {
    private providers: LiquidityProvider[];

    constructor() {
        this.providers = [
            new RaydiumService(),
            new MeteoraService()
        ];
    }

    async findBestQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        console.log(`[Router] Finding best quote for ${amount} ${tokenIn} -> ${tokenOut}...`);

        const quotePromises = this.providers.map(p => p.getQuote(tokenIn, tokenOut, amount));
        const quotes = await Promise.all(quotePromises);

        // Sort by amountOut descending (best return)
        quotes.sort((a, b) => b.amountout - a.amountout);

        const bestQuote = quotes[0];

        if (!bestQuote) {
            throw new Error(`No quotes available for ${tokenIn} -> ${tokenOut}`);
        }

        console.log(`[Router] Winner: ${bestQuote.dex} @ ${bestQuote.price.toFixed(4)} (Total: ${bestQuote.amountout.toFixed(4)})`);

        return bestQuote;
    }
}
