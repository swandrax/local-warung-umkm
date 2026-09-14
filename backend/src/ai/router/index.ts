import type { AIContext, AIResponse } from '../providers';
import { AIGateway } from '../gateway';
import { FAQAgent } from '../agents/faq';
import { ProductAgent } from '../agents/product';
import { OrderAgent } from '../agents/order';
import { HandoffAgent } from '../agents/handoff';
import type { AIProvider } from '../providers';

export enum AgentType {
  FAQ = 'FAQ',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  HANDOFF = 'HANDOFF',
}

export class AgentRouter {
  private gateway: AIGateway;
  private faqAgent: FAQAgent;
  private productAgent: ProductAgent;
  private orderAgent: OrderAgent;
  private handoffAgent: HandoffAgent;

  constructor(provider: AIProvider) {
    this.gateway = new AIGateway(provider);
    this.faqAgent = new FAQAgent(this.gateway);
    this.productAgent = new ProductAgent(this.gateway);
    this.orderAgent = new OrderAgent(this.gateway);
    this.handoffAgent = new HandoffAgent();
  }

  /**
   * Fast intent classification with keyword & semantic matching.
   */
  async classifyIntent(message: string): Promise<AgentType> {
    const lowerMessage = message.toLowerCase();

    // Handoff has priority (complaints, anger, escalation)
    if (
      lowerMessage.includes('komplain') ||
      lowerMessage.includes('kecewa') ||
      lowerMessage.includes('marah') ||
      lowerMessage.includes('manusia') ||
      lowerMessage.includes('admin manusia') ||
      lowerMessage.includes('bicara dengan orang')
    ) {
      return AgentType.HANDOFF;
    }

    // Order tracking
    if (
      lowerMessage.includes('pesanan') ||
      lowerMessage.includes('resi') ||
      lowerMessage.includes('status order') ||
      lowerMessage.includes('lacak')
    ) {
      return AgentType.ORDER;
    }

    // Product inquiries
    if (
      lowerMessage.includes('harga') ||
      lowerMessage.includes('stok') ||
      lowerMessage.includes('beli') ||
      lowerMessage.includes('produk') ||
      lowerMessage.includes('menu') ||
      lowerMessage.includes('varian') ||
      lowerMessage.includes('ada gak') ||
      lowerMessage.includes('ada tidak')
    ) {
      return AgentType.PRODUCT;
    }

    return AgentType.FAQ;
  }

  /**
   * Routes the message to the appropriate specialized agent.
   */
  async routeAndExecute(
    context: AIContext,
    message: string
  ): Promise<AIResponse & { agentUsed: AgentType }> {
    const intent = await this.classifyIntent(message);
    let result: AIResponse;

    switch (intent) {
      case AgentType.HANDOFF:
        result = await this.handoffAgent.handle(context, message);
        break;
      case AgentType.ORDER:
        result = await this.orderAgent.handle(context, message);
        break;
      case AgentType.PRODUCT:
        result = await this.productAgent.handle(context, message);
        break;
      case AgentType.FAQ:
      default:
        result = await this.faqAgent.handle(context, message);
        break;
    }

    return {
      ...result,
      agentUsed: intent,
    };
  }
}
