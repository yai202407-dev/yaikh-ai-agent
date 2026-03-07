import { DomainDefinition } from '../core/IntentClassifier.js';

/**
 * Domain definitions for intent classification
 */
export const DOMAIN_DEFINITIONS: DomainDefinition[] = [
    {
        name: 'purchase_request',
        description: 'Purchase requests, approvals, suppliers',
        keywords: ['purchase', 'request', 'buy', 'supplier', 'approval', 'gm']
    },
    {
        name: 'shop',
        description: 'Shop items, inventory, stock',
        keywords: ['shop', 'inventory', 'stock', 'item']
    },
    {
        name: 'support_ticket',
        description: 'IT support tickets, issues, bug reports',
        keywords: ['ticket', 'support', 'issue', 'bug', 'it']
    }
];
