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
        const container = document.getElementById('duitnow-qr-code');
        if (!container) return;

        // Clear previous QR code
        container.innerHTML = '';

        // Create DuitNow QR payload following EMVCo standard format
        const qrData = this.createDuitNowPayload();

        // Check if QRCode library is available
        if (typeof QRCode !== 'undefined') {
            // Generate real scannable QR code
            new QRCode(container, {
                text: qrData,
                width: 220,
                height: 220,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            // Fallback if library not loaded
            container.innerHTML = '<p style="color: red;">QR Code library not loaded</p>';
            console.error('QRCode library not available');
        }
    }

    createDuitNowPayload() {
        const coins = this.coinRates[this.selectedAmount] || 0;

        // Create a scannable payload with transaction details
        // For demo purposes, this creates a URL-based QR that can be scanned
        const transactionId = `TK${Date.now()}`;

        // DuitNow-style payload (simplified for demo)
        // Format: Merchant info + amount + reference
        const payload = {
            merchant: 'TAMAKAKI',
            merchantName: 'TamaKaki Game',
            amount: this.selectedAmount.toFixed(2),
            currency: 'MYR',
            coins: coins,
            reference: transactionId,
            description: `Purchase ${coins} coins`
        };

        // Create a scannable URL or text that includes all transaction info
        // In production, this would be a proper DuitNow QR EMVCo format
        const qrText = `https://tamakaki.demo/paynet?` +
            `merchant=${payload.merchant}` +
            `&amount=${payload.amount}` +
            `&currency=${payload.currency}` +
            `&coins=${payload.coins}` +
            `&ref=${payload.reference}` +
            `&desc=${encodeURIComponent(payload.description)}`;

        return qrText;
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
