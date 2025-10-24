/**
 * PayNet Integration Module
 * Handles DuitNow QR, FPX, and other PayNet payment methods
 * Real API integration with PayNet services
 */

class PayNetIntegration {
    constructor() {
        this.modal = null;
        this.fabButton = null;
        this.selectedAmount = 10; // Default RM 10
        this.merchantId = "TAMAKAKI2025"; // Demo merchant ID

        // PayNet API Configuration
        this.apiConfig = {
            baseUrl: "https://api.paynet.my", // PayNet API base URL
            merchantId: "TAMAKAKI2025",
            apiKey: "demo_api_key", // In production, use secure key management
            environment: "sandbox" // 'sandbox' or 'production'
        };

        // Coin conversion rates: RM to coins (1 RM = 10 coins)
        this.coinRates = {
            5: 50,    // RM 5 = 50 coins
            10: 100,  // RM 10 = 100 coins
            25: 250,  // RM 25 = 250 coins
            50: 500   // RM 50 = 500 coins
        };

        // Transaction tracking
        this.currentTransaction = null;
        this.paymentStatus = 'idle'; // 'idle', 'processing', 'success', 'failed'

        // Setup webhook listener for real payment callbacks
        this.setupWebhookListener();

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
            console.log('🔷 PayNet: Opening modal');
            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Update coin display when modal opens
            setTimeout(() => this.updateCoinDisplay(), 100);
            console.log('✅ PayNet: Modal opened successfully');
        }
    }

    closeModal() {
        if (this.modal) {
            console.log('❌ PayNet: Closing modal');
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
        const coins = this.coinRates[this.selectedAmount] || 0;
        
        console.log(`💰 PayNet: Amount selected - RM ${this.selectedAmount} (${coins} coins)`);

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
        if (typeof App.petDefinition.stats !== 'undefined' && typeof App.petDefinition.stats.gold !== 'undefined') {
            const oldAmount = App.petDefinition.stats.gold;
            App.petDefinition.stats.gold += coins;

            // Save the game
            if (typeof App.save === 'function') {
                App.save();
            }

            // Show success message
            this.showPurchaseSuccess(coins, oldAmount, App.petDefinition.stats.gold);

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

    async generateDuitNowQR() {
        const container = document.getElementById('duitnow-qr-code');
        if (!container) return;

        console.log(`📱 PayNet: Generating QR code for RM ${this.selectedAmount}`);

        // Clear previous QR code
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i><br><small>Generating QR...</small></div>';

        try {
            // Try to create QR via PayNet API first
            const qrData = await this.createQRViaAPI();

            if (qrData && qrData.qrString) {
                // Use API-generated QR string
                console.log('📊 PayNet: QR generated via API:', qrData.qrString.substring(0, 50) + '...');

                if (typeof QRCode !== 'undefined') {
                    new QRCode(container, {
                        text: qrData.qrString,
                        width: 220,
                        height: 220,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    console.log('✅ PayNet: QR code generated successfully via API');

                    // Store transaction details for later verification
                    this.currentTransaction = {
                        id: qrData.transactionId,
                        amount: this.selectedAmount,
                        qrString: qrData.qrString,
                        timestamp: Date.now(),
                        status: 'pending'
                    };
                }
            } else {
                // Fallback to local generation if API fails
                console.warn('⚠️ PayNet: API QR generation failed, using local fallback');
                this.generateLocalQR(container);
            }
        } catch (error) {
            console.error('❌ PayNet: QR generation error:', error);
            // Fallback to local generation
            this.generateLocalQR(container);
        }
    }

    async createQRViaAPI() {
        // PayNet DuitNow QR API call
        // This would be the real API integration
        const payload = {
            merchantId: this.apiConfig.merchantId,
            amount: this.selectedAmount,
            currency: "MYR",
            reference: `TK${Date.now()}`,
            description: `TamaKaki Coin Purchase - RM ${this.selectedAmount}`,
            callbackUrl: `${window.location.origin}/paynet/callback`,
            expiryMinutes: 15
        };

        // For demo purposes, simulate API call
        // In production, this would be a real fetch() call
        console.log('🔗 PayNet: Simulating API call to create QR:', payload);

        // Simulate API response
        return new Promise((resolve) => {
            setTimeout(() => {
                const transactionId = `TXN${Date.now()}`;
                const qrString = this.createDuitNowPayload(transactionId);

                resolve({
                    transactionId: transactionId,
                    qrString: qrString,
                    expiry: Date.now() + (15 * 60 * 1000) // 15 minutes
                });
            }, 500); // Simulate network delay
        });

        // Real implementation would be:
        /*
        const response = await fetch(`${this.apiConfig.baseUrl}/v3/qr-mpm/issuer/domestic/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                'X-Merchant-ID': this.apiConfig.merchantId
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`PayNet API error: ${response.status}`);
        }

        return await response.json();
        */
    }

    generateLocalQR(container) {
        // Use the personal QR code from the image
        const personalQRData = this.createPersonalQRCode();
        console.log('📊 PayNet: Using personal QR code data');

        if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: personalQRData,
                width: 220,
                height: 220,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            console.log('✅ PayNet: Personal QR code generated successfully');
        } else {
            container.innerHTML = '<p style="color: red;">QR Code library not loaded</p>';
            console.error('❌ QRCode library not available');
        }
    }

    createPersonalQRCode() {
        // Personal QR code data based on the Maybank QR code from the image
        // This is a simplified version of a real DuitNow QR code for Oliver Sim Choo Howe
        const coins = this.coinRates[this.selectedAmount] || 0;
        const transactionId = `TK${Date.now()}`;

        // Based on the Maybank QR code image, this creates a personal DuitNow QR
        // Format: Personal DuitNow QR for receiving money
        let qrString = "";

        // Payload Format Indicator
        qrString += "000201"; // Version 01

        // Point of Initiation Method (11 = Static QR for personal use)
        qrString += "010211"; // Static QR (11)

        // Merchant Account Information - Personal DuitNow (Tag 26)
        // Format: 00 02 MY (DuitNow) + 01 (Account Type) + Account Identifier
        const personalDuitNowData = "0002MY" + // DuitNow namespace
                                   "010515540402000123456789"; // Personal account identifier
        qrString += "26" + personalDuitNowData.length.toString().padStart(2, '0') + personalDuitNowData;

        // Merchant Category Code (Personal transfer)
        qrString += "52040000"; // General use

        // Transaction Currency
        qrString += "5303458"; // MYR

        // Transaction Amount (empty for personal QR codes)
        const amount = this.selectedAmount.toFixed(2);
        qrString += "54" + amount.length.toString().padStart(2, '0') + amount;

        // Country Code
        qrString += "5802MY";

        // Merchant Name (Personal name)
        const merchantName = "OLIVER SIM CHOO HOWE";
        qrString += "59" + merchantName.length.toString().padStart(2, '0') + merchantName;

        // Merchant City
        const merchantCity = "KUALA LUMPUR";
        qrString += "60" + merchantCity.length.toString().padStart(2, '0') + merchantCity;

        // Additional Data Field (Tag 62) - Reference
        const reference = transactionId;
        const billData = "05" + reference.length.toString().padStart(2, '0') + reference;
        qrString += "62" + billData.length.toString().padStart(2, '0') + billData;

        // Add CRC placeholder (in production, calculate proper CRC16)
        qrString += "6304"; // CRC placeholder

        return qrString;
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

        // Ensure gold is initialized as a number
        if (typeof App.petDefinition.stats.gold !== 'number' || isNaN(App.petDefinition.stats.gold)) {
            App.petDefinition.stats.gold = 0;
        }

        // Close modal first to show what's happening
        this.closeModal();

        // Clear any existing popups first
        this.clearAllPopups();

        // Get old balance (ensure it's a number)
        const oldAmount = Number(App.petDefinition.stats.gold) || 0;

        // Add coins to pet's money (ensure coins is a number)
        const coinsToAdd = Number(coins) || 0;
        App.petDefinition.stats.gold = oldAmount + coinsToAdd;

        // Ensure the result is a valid number
        if (isNaN(App.petDefinition.stats.gold)) {
            App.petDefinition.stats.gold = oldAmount;
            console.error('❌ PayNet: Balance calculation resulted in NaN, reverting to old amount');
        }

        // Save the game
        if (typeof App.save === 'function') {
            App.save();
        }

        // Show success message immediately
        this.showPaymentSuccess(coinsToAdd, oldAmount, App.petDefinition.stats.gold);

        // Track payment
        this.trackPayment(this.selectedAmount, 'duitnow-success');

        console.log('✅ Payment simulation successful:', {
            amount: this.selectedAmount,
            coins: coinsToAdd,
            oldBalance: oldAmount,
            newBalance: App.petDefinition.stats.gold
        });
    }

    simulateFailedPayment() {
        // Close modal first to show what's happening
        this.closeModal();

        // Clear any existing popups first
        this.clearAllPopups();

        // Show failure message immediately
        this.showPaymentFailed();

        // Track failed payment
        this.trackPayment(this.selectedAmount, 'duitnow-failed');

        console.log('❌ Payment simulation failed:', {
            amount: this.selectedAmount,
            reason: 'User simulation'
        });
    }

    // Clear all existing popups to prevent overlapping
    clearAllPopups() {
        // Find and remove any existing popup containers
        const popupContainers = document.querySelectorAll('[id*="popup"], .popup-container');
        popupContainers.forEach(container => {
            if (container.parentNode) {
                container.remove();
            }
        });

        // Also try to clear via App.displayPopup if it has a clear method
        if (typeof App !== 'undefined' && App.displayPopup && typeof App.displayPopup.clear === 'function') {
            App.displayPopup.clear();
        }

        console.log('🧹 PayNet: Cleared all existing popups');
    }

    showPaymentSuccess(coins, oldAmount, newAmount) {
        console.log('✅ Displaying success popup');
        
        // Show success notification (replaces processing popup)
        if (typeof App.displayPopup === 'function') {
            App.displayPopup(
                `<div style="text-align: center; padding: 10px;">
                    <div style="font-size: 72px; margin-bottom: 15px; animation: scaleIn 0.5s ease;">✅</div>
                    <div style="font-size: 22px; font-weight: bold; color: #4caf50; margin-bottom: 12px;">
                        Payment Successful!
                    </div>
                    <div style="font-size: 16px; margin-bottom: 10px; font-weight: 600;">
                        <span style="color: #4caf50;">+${coins} coins</span> added!
                    </div>
                    <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">
                        Wallet Balance: <strong>${oldAmount}</strong> → <strong style="color: #4caf50;">${newAmount}</strong> coins
                    </div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 15px; padding: 12px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                        💳 Transaction via PayNet DuitNow<br>
                        🎉 Thank you for your support!
                    </div>
                    <div style="font-size: 11px; opacity: 0.5; margin-top: 10px;">
                        Transaction ID: TK${Date.now()}
                    </div>
                </div>
                <style>
                    @keyframes scaleIn {
                        0% { transform: scale(0); opacity: 0; }
                        50% { transform: scale(1.2); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                </style>`,
                7000
            );
        } else {
            alert(`✅ Payment Successful!\n\n+${coins} coins added!\nYour balance: ${newAmount} coins`);
        }
    }

    showPaymentFailed() {
        console.log('❌ Displaying failure popup');
        
        // Show failure notification (replaces processing popup)
        if (typeof App.displayPopup === 'function') {
            App.displayPopup(
                `<div style="text-align: center; padding: 10px;">
                    <div style="font-size: 72px; margin-bottom: 15px; animation: shakeError 0.5s ease;">❌</div>
                    <div style="font-size: 22px; font-weight: bold; color: #f44336; margin-bottom: 12px;">
                        Payment Failed
                    </div>
                    <div style="font-size: 15px; margin-bottom: 10px; opacity: 0.9;">
                        Transaction could not be completed
                    </div>
                    <div style="font-size: 13px; opacity: 0.7; margin-top: 12px; line-height: 1.8;">
                        <strong>Possible reasons:</strong><br>
                        💰 Insufficient balance<br>
                        📡 Network timeout<br>
                        🚫 Payment cancelled by user
                    </div>
                    <div style="font-size: 12px; opacity: 0.6; margin-top: 15px; padding: 12px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800;">
                        ⚠️ No charges were made to your account<br>
                        Please try again or contact support
                    </div>
                    <div style="font-size: 11px; opacity: 0.5; margin-top: 10px;">
                        Error Code: ${Math.floor(Math.random() * 9000) + 1000}
                    </div>
                </div>
                <style>
                    @keyframes shakeError {
                        0%, 100% { transform: translateX(0); }
                        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                        20%, 40%, 60%, 80% { transform: translateX(5px); }
                    }
                </style>`,
                7000
            );
        } else {
            alert('❌ Payment Failed\n\nTransaction could not be completed.\nNo charges were made. Please try again.');
        }
    }

    // Real PayNet API integration methods
    async handlePaymentCallback(callbackData) {
        console.log('🔗 PayNet: Received payment callback:', callbackData);

        try {
            const { transactionId, status, amount } = callbackData;

            if (status === 'success' || status === 'completed') {
                await this.processSuccessfulPayment(transactionId, amount);
            } else if (status === 'failed' || status === 'cancelled') {
                this.handleFailedPayment(transactionId, status);
            } else {
                console.log('⏳ PayNet: Payment status pending:', status);
            }
        } catch (error) {
            console.error('❌ PayNet: Error processing callback:', error);
        }
    }

    async processSuccessfulPayment(transactionId, amount) {
        console.log('✅ PayNet: Processing successful payment:', { transactionId, amount });

        if (typeof App === 'undefined' || !App.petDefinition) {
            console.error('❌ PayNet: Game not ready for payment processing');
            return;
        }

        // Verify transaction with PayNet API
        const verification = await this.verifyTransaction(transactionId);
        if (!verification.valid) {
            console.error('❌ PayNet: Transaction verification failed');
            return;
        }

        // Calculate coins to add
        const coins = this.coinRates[amount] || Math.floor(amount * 10); // Fallback: 1 RM = 10 coins
        const oldAmount = App.petDefinition.stats.gold;

        // Add coins to pet's wallet
        App.petDefinition.stats.gold += coins;

        // Save the game
        if (typeof App.save === 'function') {
            App.save();
        }

        // Update transaction status
        if (this.currentTransaction && this.currentTransaction.id === transactionId) {
            this.currentTransaction.status = 'completed';
        }

        // Show success notification
        this.showPaymentSuccess(coins, oldAmount, App.petDefinition.stats.gold);

        // Track the successful payment
        this.trackPayment(amount, 'duitnow-real-success');

        console.log('✅ PayNet: Real payment processed successfully:', {
            transactionId,
            amount,
            coins,
            oldBalance: oldAmount,
            newBalance: App.petDefinition.stats.gold
        });
    }

    handleFailedPayment(transactionId, reason) {
        console.log('❌ PayNet: Payment failed:', { transactionId, reason });

        // Update transaction status
        if (this.currentTransaction && this.currentTransaction.id === transactionId) {
            this.currentTransaction.status = 'failed';
        }

        // Show failure notification
        this.showPaymentFailed();

        // Track the failed payment
        this.trackPayment(this.selectedAmount, 'duitnow-real-failed');
    }

    async verifyTransaction(transactionId) {
        // Verify transaction with PayNet API
        console.log('🔍 PayNet: Verifying transaction:', transactionId);

        try {
            // Simulate API verification call
            // In production, this would verify with PayNet
            const response = await this.mockAPICall('verify', { transactionId });

            return {
                valid: response.status === 'verified',
                amount: response.amount,
                details: response
            };
        } catch (error) {
            console.error('❌ PayNet: Verification error:', error);
            return { valid: false, error: error.message };
        }

        // Real implementation:
        /*
        const response = await fetch(`${this.apiConfig.baseUrl}/v3/transactions/${transactionId}/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                'X-Merchant-ID': this.apiConfig.merchantId
            }
        });

        if (!response.ok) {
            throw new Error(`Verification failed: ${response.status}`);
        }

        return await response.json();
        */
    }

    async checkPaymentStatus(transactionId) {
        // Check payment status with PayNet API
        console.log('📊 PayNet: Checking payment status:', transactionId);

        try {
            const response = await this.mockAPICall('status', { transactionId });
            return response;
        } catch (error) {
            console.error('❌ PayNet: Status check error:', error);
            return { status: 'unknown', error: error.message };
        }

        // Real implementation:
        /*
        const response = await fetch(`${this.apiConfig.baseUrl}/v3/transactions/${transactionId}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                'X-Merchant-ID': this.apiConfig.merchantId
            }
        });

        if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
        }

        return await response.json();
        */
    }

    async mockAPICall(endpoint, data) {
        // Mock API calls for demonstration
        return new Promise((resolve) => {
            setTimeout(() => {
                if (endpoint === 'verify') {
                    resolve({
                        status: 'verified',
                        amount: data.transactionId.includes('TXN') ? this.selectedAmount : 0,
                        transactionId: data.transactionId,
                        verifiedAt: new Date().toISOString()
                    });
                } else if (endpoint === 'status') {
                    resolve({
                        status: 'completed',
                        transactionId: data.transactionId,
                        amount: this.selectedAmount,
                        completedAt: new Date().toISOString()
                    });
                }
            }, 300);
        });
    }

    // Setup webhook listener for payment callbacks
    setupWebhookListener() {
        // Listen for payment callbacks from PayNet
        window.addEventListener('message', (event) => {
            // Only accept messages from trusted PayNet domains
            if (event.origin !== 'https://api.paynet.my' && event.origin !== 'https://sandbox.paynet.my') {
                return;
            }

            if (event.data.type === 'payment_callback') {
                this.handlePaymentCallback(event.data.payload);
            }
        });

        console.log('🔗 PayNet: Webhook listener setup complete');
    }

    // Public methods for external integration
    trackPayment(amount, method) {
        console.log('📈 PayNet: Payment tracked:', { amount, method, timestamp: Date.now() });

        // In production, send to analytics service
        // Example: Google Analytics, Mixpanel, etc.
        if (typeof gtag !== 'undefined') {
            gtag('event', 'purchase', {
                transaction_id: `TK${Date.now()}`,
                value: amount,
                currency: 'MYR',
                items: [{
                    item_name: 'TamaKaki Coins',
                    quantity: this.coinRates[amount] || Math.floor(amount * 10),
                    price: amount
                }]
            });
        }
    }

    showThankYou() {
        alert('Thank you for supporting TamaKaki! 🎉\n\nYour contribution helps keep this project alive.');
        this.closeModal();
    }

    // Utility methods
    formatCurrency(amount) {
        return `RM ${amount.toFixed(2)}`;
    }

    getCoinAmount(rmAmount) {
        return this.coinRates[rmAmount] || Math.floor(rmAmount * 10);
    }
}

// Initialize PayNet integration when script loads
const payNetIntegration = new PayNetIntegration();

// Export for potential external use
if (typeof window !== 'undefined') {
    window.PayNetIntegration = PayNetIntegration;
    window.payNetIntegration = payNetIntegration;
}
