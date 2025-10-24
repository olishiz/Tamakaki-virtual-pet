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

        // Simulation buttons
        const successBtn = document.getElementById('simulate-success-btn');
        if (successBtn) {
            successBtn.addEventListener('click', () => this.simulateSuccessfulPayment());
        }

        const failBtn = document.getElementById('simulate-fail-btn');
        if (failBtn) {
            failBtn.addEventListener('click', () => this.simulateFailedPayment());
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
        const transactionId = `TK${Date.now()}`;

        // Create a more realistic DuitNow QR format for Touch'n Go scanning
        // Using EMVCo QR Code format structure

        // Format breakdown:
        // 00 = Payload Format Indicator
        // 01 = Point of Initiation Method
        // 26-51 = Merchant Account Information (DuitNow)
        // 52 = Merchant Category Code
        // 53 = Transaction Currency (458 = MYR)
        // 54 = Transaction Amount
        // 58 = Country Code (MY)
        // 59 = Merchant Name
        // 60 = Merchant City
        // 62 = Additional Data Field
        // 63 = CRC (checksum)

        const merchantName = "TAMAKAKI GAME";
        const merchantCity = "KUALA LUMPUR";
        const amount = this.selectedAmount.toFixed(2);
        const reference = transactionId;

        // Simplified DuitNow QR payload (closer to real format)
        // In production, this would be generated by PayNet's API
        let qrString = "";

        // Payload Format Indicator
        qrString += "000201"; // Version 01

        // Point of Initiation Method
        qrString += "010212"; // Dynamic QR (12)

        // Merchant Account Information - DuitNow (Tag 26)
        const duitnowData = "0010MY.DUITNOW" + // DuitNow namespace
                           "0109TAMAKAKI2025"; // Proxy ID
        qrString += "26" + duitnowData.length.toString().padStart(2, '0') + duitnowData;

        // Merchant Category Code
        qrString += "52040000"; // General use

        // Transaction Currency
        qrString += "5303458"; // MYR

        // Transaction Amount
        qrString += "54" + amount.length.toString().padStart(2, '0') + amount;

        // Country Code
        qrString += "5802MY";

        // Merchant Name
        qrString += "59" + merchantName.length.toString().padStart(2, '0') + merchantName;

        // Merchant City
        qrString += "60" + merchantCity.length.toString().padStart(2, '0') + merchantCity;

        // Additional Data Field (Tag 62) - Bill Number
        const billData = "05" + reference.length.toString().padStart(2, '0') + reference;
        qrString += "62" + billData.length.toString().padStart(2, '0') + billData;

        // Add CRC placeholder (in production, calculate proper CRC16)
        qrString += "6304"; // CRC placeholder

        return qrString;
    }

    simulateSuccessfulPayment() {
        const coins = this.coinRates[this.selectedAmount] || 0;

        if (typeof App === 'undefined' || !App.petDefinition) {
            alert('Game not ready. Please try again.');
            return;
        }

        // Simulate payment processing
        const processingPopup = this.showProcessingPopup();

        setTimeout(() => {
            // Close processing popup
            if (processingPopup && typeof processingPopup.close === 'function') {
                processingPopup.close();
            }

            // Add coins to pet's money
            const oldAmount = App.petDefinition.golds;
            App.petDefinition.golds += coins;

            // Save the game
            if (typeof App.save === 'function') {
                App.save();
            }

            // Show success message
            this.showPaymentSuccess(coins, oldAmount, App.petDefinition.golds);

            // Track payment
            this.trackPayment(this.selectedAmount, 'duitnow-success');
        }, 2000); // 2 second delay to simulate processing
    }

    simulateFailedPayment() {
        // Simulate payment processing
        const processingPopup = this.showProcessingPopup();

        setTimeout(() => {
            // Close processing popup
            if (processingPopup && typeof processingPopup.close === 'function') {
                processingPopup.close();
            }

            // Show failure message
            this.showPaymentFailed();

            // Track failed payment
            this.trackPayment(this.selectedAmount, 'duitnow-failed');
        }, 2000); // 2 second delay to simulate processing
    }

    showProcessingPopup() {
        if (typeof App.displayPopup === 'function') {
            return App.displayPopup(
                `<div style="text-align: center;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 48px; color: #1976d2; margin-bottom: 15px;"></i>
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
                        Processing Payment...
                    </div>
                    <div style="font-size: 13px; opacity: 0.8;">
                        Please wait while we confirm your transaction
                    </div>
                </div>`,
                999999 // Long timeout, we'll close it manually
            );
        }
        return null;
    }

    showPaymentSuccess(coins, oldAmount, newAmount) {
        // Close the modal
        this.closeModal();

        // Show success notification
        if (typeof App.displayPopup === 'function') {
            App.displayPopup(
                `<div style="text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 15px;">✅</div>
                    <div style="font-size: 20px; font-weight: bold; color: #4caf50; margin-bottom: 10px;">
                        Payment Successful!
                    </div>
                    <div style="font-size: 15px; margin-bottom: 8px;">
                        <strong>+${coins} coins</strong> added to your wallet
                    </div>
                    <div style="font-size: 13px; opacity: 0.8; margin-bottom: 5px;">
                        Balance: ${oldAmount} → ${newAmount} coins
                    </div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 12px; padding: 10px; background: #f0f0f0; border-radius: 8px;">
                        Transaction completed via PayNet DuitNow
                    </div>
                </div>`,
                6000
            );
        } else {
            alert(`✅ Payment Successful!\n\n+${coins} coins added!\nYour balance: ${newAmount} coins`);
        }
    }

    showPaymentFailed() {
        // Close the modal
        this.closeModal();

        // Show failure notification
        if (typeof App.displayPopup === 'function') {
            App.displayPopup(
                `<div style="text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 15px;">❌</div>
                    <div style="font-size: 20px; font-weight: bold; color: #f44336; margin-bottom: 10px;">
                        Payment Failed
                    </div>
                    <div style="font-size: 14px; margin-bottom: 8px; opacity: 0.9;">
                        Transaction could not be completed
                    </div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 12px;">
                        Possible reasons:<br>
                        • Insufficient balance<br>
                        • Network timeout<br>
                        • Payment cancelled
                    </div>
                    <div style="font-size: 11px; opacity: 0.6; margin-top: 15px; padding: 10px; background: #fff3e0; border-radius: 8px;">
                        No charges were made. Please try again.
                    </div>
                </div>`,
                6000
            );
        } else {
            alert('❌ Payment Failed\n\nTransaction could not be completed.\nNo charges were made. Please try again.');
        }
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
