/**
 * PayNet Integration Module
 * Handles DuitNow QR, FPX, and other PayNet payment methods
 */

class PayNetIntegration {
    constructor() {
        this.modal = null;
        this.fabButton = null;
        this.selectedAmount = 10; // Default RM 10
        this.merchantId = "TAMAKAKI2025"; // Demo merchant ID

        // Coin conversion rates: RM to coins (1 RM = 10 coins)
        this.coinRates = {
            5: 50,    // RM 5 = 50 coins
            10: 100,  // RM 10 = 100 coins
            25: 250,  // RM 25 = 250 coins
            50: 500   // RM 50 = 500 coins
        };

        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.modal = document.getElementById('paynet-modal');
        this.fabButton = document.getElementById('paynet-fab');
        this.gameButton = document.getElementById('paynet-game-btn');
        const closeBtn = document.getElementById('paynet-close-btn');

        // Open modal from floating button
        if (this.fabButton) {
            this.fabButton.addEventListener('click', () => this.openModal());
        }

        // Open modal from game button (main button near pet)
        if (this.gameButton) {
            this.gameButton.addEventListener('click', () => this.openModal());
        }

        // Close modal
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Tab switching
        const tabs = document.querySelectorAll('.paynet-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Amount selection
        const amountButtons = document.querySelectorAll('.amount-btn');
        amountButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectAmount(btn);
            });
        });

        // FPX payment button
        const fpxBtn = document.getElementById('fpx-payment-btn');
        if (fpxBtn) {
            fpxBtn.addEventListener('click', () => this.initiateFPXPayment());
        }

        // Purchase coins button
        const purchaseBtn = document.getElementById('purchase-coins-btn');
        if (purchaseBtn) {
            purchaseBtn.addEventListener('click', () => this.purchaseCoins());
        }

        // Select default amount
        const defaultBtn = document.querySelector('.amount-btn[data-amount="10"]');
        if (defaultBtn) {
            this.selectAmount(defaultBtn);
        }
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Update coin display when modal opens
            setTimeout(() => this.updateCoinDisplay(), 100);
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.paynet-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab panels
        const panels = document.querySelectorAll('.paynet-tab-panel');
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabName}`);
        });
    }

    selectAmount(button) {
        // Update button states
        const amountButtons = document.querySelectorAll('.amount-btn');
        amountButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');

        // Update selected amount
        this.selectedAmount = parseInt(button.dataset.amount);

        // Update coin display
        this.updateCoinDisplay();

        // Regenerate QR code
        this.generateDuitNowQR();
    }

    updateCoinDisplay() {
        const coins = this.coinRates[this.selectedAmount] || 0;

        // Update all amount buttons to show coins
        const amountButtons = document.querySelectorAll('.amount-btn');
        amountButtons.forEach(btn => {
            const amount = parseInt(btn.dataset.amount);
            const coinAmount = this.coinRates[amount] || 0;
            btn.innerHTML = `RM ${amount}<br><small style="opacity: 0.8; font-size: 11px;">${coinAmount} coins</small>`;
        });
    }

    purchaseCoins() {
        const coins = this.coinRates[this.selectedAmount] || 0;

        if (typeof App === 'undefined' || !App.petDefinition) {
            alert('Game not ready. Please try again.');
            return;
        }

        // Show confirmation
        const confirmed = confirm(
            `Purchase ${coins} coins for RM ${this.selectedAmount}?\n\n` +
            `This will add ${coins} coins to your pet's money!`
        );

        if (!confirmed) return;

        // Add coins to pet's money
        if (typeof App.petDefinition.golds !== 'undefined') {
            const oldAmount = App.petDefinition.golds;
            App.petDefinition.golds += coins;

            // Save the game
            if (typeof App.save === 'function') {
                App.save();
            }

            // Show success message
            this.showPurchaseSuccess(coins, oldAmount, App.petDefinition.golds);

            // Track purchase
            this.trackPayment(this.selectedAmount, 'duitnow-demo');
        } else {
            alert('Error: Unable to add coins. Please try again.');
        }
    }

    showPurchaseSuccess(coins, oldAmount, newAmount) {
        // Close the modal
        this.closeModal();

        // Show success notification
        if (typeof App.displayPopup === 'function') {
            App.displayPopup(
                `<div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
                    <div style="font-size: 18px; font-weight: bold; color: #4caf50; margin-bottom: 8px;">
                        Purchase Successful!
                    </div>
                    <div style="font-size: 14px; margin-bottom: 5px;">
                        +${coins} coins added!
                    </div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        ${oldAmount} → ${newAmount} coins
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; opacity: 0.7;">
                        Thank you for supporting TamaKaki via PayNet! 🎉
                    </div>
                </div>`,
                5000
            );
        } else {
            alert(`Success! +${coins} coins added!\n\nYour balance: ${newAmount} coins`);
        }
    }

    generateDuitNowQR() {
        const canvas = document.getElementById('duitnow-qr-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = 250;
        canvas.height = 250;

        // DuitNow QR payload structure (simplified for demo)
        // In production, use proper EMVCo QR standard
        const qrData = this.createDuitNowPayload();

        // Generate QR code using a simple implementation
        this.drawQRCode(ctx, qrData, canvas.width, canvas.height);
    }

    createDuitNowPayload() {
        // Simplified DuitNow QR payload
        // Format: PayNet standard with merchant info and amount
        const payload = {
            version: '01',
            merchantId: this.merchantId,
            amount: this.selectedAmount.toFixed(2),
            currency: 'MYR',
            reference: `TAMAKAKI-${Date.now()}`,
            description: `TamaKaki Support - RM${this.selectedAmount}`
        };

        // Create QR data string
        return `00020101021226${this.merchantId.length.toString().padStart(2, '0')}${this.merchantId}5204000053033605802MY5913TamaKaki Game6011Kuala Lumpur62070503***6304`;
    }

    drawQRCode(ctx, data, width, height) {
        // Simple QR code visualization (demo version)
        // In production, use a proper QR library like qrcode.js

        const size = 25; // Grid size
        const cellSize = Math.floor(width / size);
        const padding = (width - (cellSize * size)) / 2;

        // Clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Generate pseudo-random pattern based on data
        const seed = this.hashCode(data);
        const random = this.seededRandom(seed);

        // Draw QR pattern
        ctx.fillStyle = '#000000';

        // Position detection patterns (corners)
        this.drawFinderPattern(ctx, padding, padding, cellSize);
        this.drawFinderPattern(ctx, padding + (size - 7) * cellSize, padding, cellSize);
        this.drawFinderPattern(ctx, padding, padding + (size - 7) * cellSize, cellSize);

        // Draw data modules
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Skip finder patterns
                if (this.isFinderPattern(x, y, size)) continue;

                // Pseudo-random based on position and data
                const val = (x * y + random() * 1000) % 2;
                if (val < 1) {
                    ctx.fillRect(
                        padding + x * cellSize,
                        padding + y * cellSize,
                        cellSize - 1,
                        cellSize - 1
                    );
                }
            }
        }

        // Add PayNet branding in center
        this.addCenterBranding(ctx, width, height);
    }

    drawFinderPattern(ctx, x, y, cellSize) {
        // Outer square (7x7)
        ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    }

    isFinderPattern(x, y, size) {
        // Top-left
        if (x < 8 && y < 8) return true;
        // Top-right
        if (x >= size - 8 && y < 8) return true;
        // Bottom-left
        if (x < 8 && y >= size - 8) return true;
        return false;
    }

    addCenterBranding(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const logoSize = 40;

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(centerX - logoSize / 2 - 5, centerY - logoSize / 2 - 5, logoSize + 10, logoSize + 10);

        // PayNet colors (blue)
        ctx.fillStyle = '#1976d2';
        ctx.fillRect(centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);

        // "PN" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PN', centerX, centerY);
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    initiateFPXPayment() {
        // Demo FPX payment flow
        alert(`FPX Payment Flow\n\nAmount: RM ${this.selectedAmount}\nMerchant: TamaKaki Game\n\nIn production, this would redirect to FPX banking portal.\n\nFor demo purposes, this shows the integration point for PayNet's FPX service.`);

        // In production, this would:
        // 1. Create payment order on backend
        // 2. Get FPX payment URL
        // 3. Redirect to FPX portal
        // 4. Handle callback after payment

        console.log('FPX Payment initiated:', {
            amount: this.selectedAmount,
            currency: 'MYR',
            merchantId: this.merchantId,
            timestamp: new Date().toISOString()
        });
    }

    // Public methods for external integration
    trackPayment(amount, method) {
        console.log('Payment tracked:', { amount, method, timestamp: Date.now() });
        // In production, send to analytics/backend
    }

    showThankYou() {
        alert('Thank you for supporting TamaKaki! 🎉\n\nYour contribution helps keep this project alive.');
        this.closeModal();
    }
}

// Initialize PayNet integration when script loads
const payNetIntegration = new PayNetIntegration();

// Export for potential external use
if (typeof window !== 'undefined') {
    window.PayNetIntegration = PayNetIntegration;
    window.payNetIntegration = payNetIntegration;
}
