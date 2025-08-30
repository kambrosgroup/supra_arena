// Oracle Arena - Supra Web3 Battle Game
// Simulates integration with Supra blockchain APIs

class OracleArena {
    constructor() {
        this.wallet = {
            connected: false,
            address: null,
            supraBalance: 0,
            ethBalance: 0
        };
        
        this.gameState = {
            inBattle: false,
            currentTurn: 'player1',
            turnTimeLeft: 30,
            player1: {
                health: 100,
                maxHealth: 100,
                attack: 25,
                defense: 15,
                stake: 0.1
            },
            player2: {
                health: 100,
                maxHealth: 100,
                attack: 20,
                defense: 20,
                stake: 0.1
            }
        };
        
        this.priceData = {
            eth_usd: {
                price: 3245.67,
                change: 1.2,
                lastDelta: 0.012
            },
            btc_usd: {
                price: 96913.07,
                change: -0.8,
                lastDelta: -0.008
            }
        };
        
        this.vrfData = {
            nonce: 12345,
            randomSeed: '0x7a8f9b2c...',
            lastRequest: null
        };
        
        this.battleLog = [];
        this.updateIntervals = [];
        this.turnInterval = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.startPriceFeedUpdates();
        this.startTournamentCountdown();
        this.addLogEntry('Battle system initialized - Connect wallet to begin');
        this.updateHealthBars(); // Initialize health bars
    }
    
    bindEvents() {
        // Wallet connection
        document.getElementById('walletButton').addEventListener('click', () => {
            this.toggleWallet();
        });
        
        // Modal controls
        document.getElementById('modalOverlay').addEventListener('click', () => {
            this.closeWalletModal();
        });
        
        document.getElementById('closeWalletModal').addEventListener('click', () => {
            this.closeWalletModal();
        });
        
        document.getElementById('disconnectWallet').addEventListener('click', () => {
            this.disconnectWallet();
        });
        
        // Proof modal
        document.getElementById('proofModal').addEventListener('click', () => {
            this.openProofModal();
        });
        
        document.getElementById('proofOverlay').addEventListener('click', () => {
            this.closeProofModal();
        });
        
        document.getElementById('closeProofModal').addEventListener('click', () => {
            this.closeProofModal();
        });
        
        // Battle controls
        document.getElementById('joinBattleBtn').addEventListener('click', () => {
            this.joinBattle();
        });
        
        document.getElementById('attackBtn').addEventListener('click', () => {
            this.performAction('attack');
        });
        
        document.getElementById('defendBtn').addEventListener('click', () => {
            this.performAction('defend');
        });
        
        document.getElementById('specialBtn').addEventListener('click', () => {
            this.performAction('special');
        });
        
        // VRF loot box
        document.getElementById('openLootBox').addEventListener('click', () => {
            this.openLootBox();
        });
        
        // Battle log clear
        document.getElementById('clearLog').addEventListener('click', () => {
            this.clearBattleLog();
        });
        
        // Stake amount change
        document.getElementById('stakeAmount').addEventListener('change', (e) => {
            this.updateStakeAmount(parseFloat(e.target.value));
        });
    }
    
    // Wallet Management
    async toggleWallet() {
        if (!this.wallet.connected) {
            await this.connectWallet();
        } else {
            this.openWalletModal();
        }
    }
    
    async connectWallet() {
        try {
            const button = document.getElementById('walletButton');
            button.textContent = 'Connecting...';
            button.disabled = true;
            
            this.addLogEntry('Connecting to StarKey Wallet...');
            
            // Simulate async wallet connection with realistic delay
            await this.delay(2000);
            
            this.wallet.connected = true;
            this.wallet.address = '0x742d35Cc6635C0532925a3b8D0A7C4e7C8d5A9f8';
            this.wallet.supraBalance = 147.25;
            this.wallet.ethBalance = 2.34;
            
            this.updateWalletDisplay();
            this.addLogEntry(`✅ Wallet connected: ${this.wallet.address.slice(0, 8)}...`);
            this.addLogEntry('Ready to battle! Select stake amount and join queue.');
            
            // Enable battle button
            document.getElementById('joinBattleBtn').disabled = false;
            
        } catch (error) {
            this.addLogEntry('❌ Failed to connect wallet - Please try again');
            console.error('Wallet connection error:', error);
            
            const button = document.getElementById('walletButton');
            button.textContent = 'Connect StarKey Wallet';
            button.disabled = false;
        }
    }
    
    disconnectWallet() {
        this.wallet.connected = false;
        this.wallet.address = null;
        this.wallet.supraBalance = 0;
        this.wallet.ethBalance = 0;
        
        // Reset battle state
        if (this.gameState.inBattle) {
            this.resetBattle();
        }
        
        this.updateWalletDisplay();
        this.closeWalletModal();
        this.addLogEntry('Wallet disconnected');
        
        // Disable battle button
        document.getElementById('joinBattleBtn').disabled = true;
    }
    
    updateWalletDisplay() {
        const button = document.getElementById('walletButton');
        const address = document.getElementById('walletAddress');
        const supraBalance = document.getElementById('supraBalance');
        const ethBalance = document.getElementById('ethBalance');
        
        if (this.wallet.connected) {
            button.textContent = `${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`;
            button.className = 'btn btn--secondary';
            button.disabled = false;
            address.textContent = this.wallet.address;
            supraBalance.textContent = `${this.wallet.supraBalance.toFixed(2)} SUPRA`;
            ethBalance.textContent = `${this.wallet.ethBalance.toFixed(3)} ETH`;
        } else {
            button.textContent = 'Connect StarKey Wallet';
            button.className = 'btn btn--primary';
            button.disabled = false;
            address.textContent = 'Not connected';
            supraBalance.textContent = '0.00 SUPRA';
            ethBalance.textContent = '0.00 ETH';
        }
    }
    
    // Modal Management
    openWalletModal() {
        document.getElementById('walletModal').classList.remove('hidden');
    }
    
    closeWalletModal() {
        document.getElementById('walletModal').classList.add('hidden');
    }
    
    openProofModal() {
        document.getElementById('proofModalDialog').classList.remove('hidden');
    }
    
    closeProofModal() {
        document.getElementById('proofModalDialog').classList.add('hidden');
    }
    
    // Oracle Price Feed Integration
    async startPriceFeedUpdates() {
        const updatePrices = async () => {
            try {
                // Simulate API call to https://prod-kline-rest.supra.com/latest
                await this.fetchSupraPriceFeeds();
                this.updatePriceDisplay();
                this.calculateOracleMultipliers();
            } catch (error) {
                console.error('Price feed update error:', error);
            }
        };
        
        // Initial update
        await updatePrices();
        
        // Update every 8 seconds
        const interval = setInterval(updatePrices, 8000);
        this.updateIntervals.push(interval);
    }
    
    async fetchSupraPriceFeeds() {
        // Simulate real API call to Supra Oracle
        // In production: fetch('https://prod-kline-rest.supra.com/latest')
        await this.delay(100);
        
        // Simulate more realistic price fluctuations
        const ethVariation = (Math.random() - 0.5) * 50; // ±$25
        const btcVariation = (Math.random() - 0.5) * 1000; // ±$500
        
        const previousEth = this.priceData.eth_usd.price;
        const previousBtc = this.priceData.btc_usd.price;
        
        this.priceData.eth_usd.price = Math.max(100, this.priceData.eth_usd.price + ethVariation);
        this.priceData.btc_usd.price = Math.max(1000, this.priceData.btc_usd.price + btcVariation);
        
        // Calculate deltas for oracle multipliers
        this.priceData.eth_usd.lastDelta = (this.priceData.eth_usd.price - previousEth) / previousEth;
        this.priceData.btc_usd.lastDelta = (this.priceData.btc_usd.price - previousBtc) / previousBtc;
        
        this.priceData.eth_usd.change = this.priceData.eth_usd.lastDelta * 100;
        this.priceData.btc_usd.change = this.priceData.btc_usd.lastDelta * 100;
    }
    
    updatePriceDisplay() {
        document.getElementById('ethPrice').textContent = this.priceData.eth_usd.price.toFixed(2);
        document.getElementById('btcPrice').textContent = this.priceData.btc_usd.price.toFixed(2);
        
        const ethChangeEl = document.getElementById('ethChange');
        const btcChangeEl = document.getElementById('btcChange');
        
        ethChangeEl.textContent = `${this.priceData.eth_usd.change >= 0 ? '+' : ''}${this.priceData.eth_usd.change.toFixed(2)}%`;
        btcChangeEl.textContent = `${this.priceData.btc_usd.change >= 0 ? '+' : ''}${this.priceData.btc_usd.change.toFixed(2)}%`;
        
        // Update change colors
        ethChangeEl.parentElement.className = `price-change ${this.priceData.eth_usd.change >= 0 ? 'positive' : 'negative'}`;
        btcChangeEl.parentElement.className = `price-change ${this.priceData.btc_usd.change >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('lastUpdate').textContent = 'Just now';
    }
    
    calculateOracleMultipliers() {
        // ETH delta affects attack multiplier
        const ethMultiplier = Math.abs(this.priceData.eth_usd.lastDelta) * 200; // Amplify for visibility
        const btcMultiplier = Math.abs(this.priceData.btc_usd.lastDelta) * 150;
        
        document.getElementById('ethMultiplier').textContent = `${this.priceData.eth_usd.change >= 0 ? '+' : '-'}${ethMultiplier.toFixed(1)}%`;
        document.getElementById('btcMultiplier').textContent = `+${btcMultiplier.toFixed(1)}%`;
    }
    
    // Battle System
    async joinBattle() {
        if (!this.wallet.connected) {
            this.addLogEntry('❌ Please connect your wallet first');
            return;
        }
        
        if (this.gameState.inBattle) {
            this.addLogEntry('⚔️ Already in battle!');
            return;
        }
        
        const stakeAmount = parseFloat(document.getElementById('stakeAmount').value);
        const joinBtn = document.getElementById('joinBattleBtn');
        
        // Update button to show loading
        joinBtn.textContent = 'Finding Opponent...';
        joinBtn.disabled = true;
        
        this.addLogEntry(`🎯 Joining battle queue with ${stakeAmount} ETH stake...`);
        this.addLogEntry('🔍 Searching for worthy opponent...');
        
        // Simulate finding opponent
        await this.delay(3000);
        
        this.gameState.inBattle = true;
        this.gameState.player1.health = this.gameState.player1.maxHealth;
        this.gameState.player2.health = this.gameState.player2.maxHealth;
        this.gameState.player1.stake = stakeAmount;
        this.gameState.player2.stake = stakeAmount;
        this.gameState.currentTurn = 'player1';
        
        this.addLogEntry('⚔️ Opponent found! Battle begins!');
        this.addLogEntry(`💰 Stakes locked: ${stakeAmount} ETH each (Total pool: ${(stakeAmount * 2).toFixed(2)} ETH)`);
        this.addLogEntry('🎲 Oracle multipliers now active for combat!');
        
        this.updateBattleUI();
        this.updateHealthBars();
        this.startTurnTimer();
        
        // Update button and UI
        joinBtn.textContent = 'Battle In Progress';
        document.getElementById('currentTurn').textContent = 'Your Turn';
        
        // Enable action buttons
        document.getElementById('attackBtn').disabled = false;
        document.getElementById('defendBtn').disabled = false;
        document.getElementById('specialBtn').disabled = false;
    }
    
    async performAction(actionType) {
        if (!this.gameState.inBattle || this.gameState.currentTurn !== 'player1') {
            return;
        }
        
        // Clear any existing turn timer
        if (this.turnInterval) {
            clearInterval(this.turnInterval);
            this.turnInterval = null;
        }
        
        // Disable action buttons during action
        this.setActionButtonsEnabled(false);
        
        const player1 = this.gameState.player1;
        const player2 = this.gameState.player2;
        
        let damage = 0;
        let actionResult = '';
        
        // Get oracle multipliers
        const ethMultiplier = 1 + (this.priceData.eth_usd.lastDelta * 15); // Amplified impact
        const btcMultiplier = 1 + (Math.abs(this.priceData.btc_usd.lastDelta) * 10);
        
        // Add VRF for critical hits
        const vrfRoll = Math.random();
        const isCritical = vrfRoll < 0.15; // 15% crit chance
        
        switch (actionType) {
            case 'attack':
                damage = Math.floor(player1.attack * Math.max(0.5, ethMultiplier));
                if (isCritical) damage = Math.floor(damage * 1.5);
                player2.health = Math.max(0, player2.health - damage);
                actionResult = `⚔️ Oracle Warrior attacks for ${damage} damage!${isCritical ? ' 💥 CRITICAL HIT!' : ''} (ETH oracle: ${((ethMultiplier - 1) * 100).toFixed(1)}%)`;
                break;
                
            case 'defend':
                const defenseBonus = Math.floor(player1.defense * btcMultiplier * 0.2);
                actionResult = `🛡️ Oracle Warrior defends (+${defenseBonus} defense, BTC oracle: +${((btcMultiplier - 1) * 100).toFixed(1)}%)`;
                // Store defense bonus for next enemy attack
                this.gameState.player1.tempDefense = defenseBonus;
                break;
                
            case 'special':
                if (this.gameState.player1.health < 50) {
                    damage = Math.floor(50 * Math.max(0.8, ethMultiplier) * 1.8);
                    if (isCritical) damage = Math.floor(damage * 1.3);
                    player2.health = Math.max(0, player2.health - damage);
                    actionResult = `✨ Oracle Warrior uses Price Surge Strike for ${damage} damage!${isCritical ? ' 💥 DEVASTATING!' : ''} (Enhanced by ETH oracle)`;
                } else {
                    this.addLogEntry('⚠️ Special attack requires health below 50!');
                    this.setActionButtonsEnabled(true);
                    this.startTurnTimer();
                    return;
                }
                break;
        }
        
        this.addLogEntry(actionResult);
        this.updateHealthBars();
        
        // Check for battle end
        if (player2.health <= 0) {
            await this.delay(1000);
            this.endBattle('player1');
            return;
        }
        
        // Switch turns
        await this.delay(2000);
        this.performAITurn();
    }
    
    async performAITurn() {
        if (!this.gameState.inBattle) return;
        
        this.gameState.currentTurn = 'player2';
        document.getElementById('currentTurn').textContent = '🤖 Opponent\'s Turn';
        
        await this.delay(2500);
        
        // AI makes intelligent action based on health
        const player1 = this.gameState.player1;
        const player2 = this.gameState.player2;
        
        let action;
        if (player2.health < 30 && Math.random() < 0.6) {
            action = 'special'; // AI prefers special when low health
        } else if (player1.health < 40 && Math.random() < 0.4) {
            action = 'attack'; // Go for kill
        } else {
            const actions = ['attack', 'defend', 'attack']; // Weight toward attack
            action = actions[Math.floor(Math.random() * actions.length)];
        }
        
        let damage = 0;
        let actionResult = '';
        
        // Get oracle multipliers for AI
        const ethMultiplier = 1 + (this.priceData.eth_usd.lastDelta * 12);
        const vrfRoll = Math.random();
        const isCritical = vrfRoll < 0.12; // 12% crit chance for AI
        
        switch (action) {
            case 'attack':
                damage = Math.floor(player2.attack * Math.max(0.5, ethMultiplier));
                // Apply player defense if they defended last turn
                if (this.gameState.player1.tempDefense) {
                    damage = Math.max(1, damage - this.gameState.player1.tempDefense);
                    this.gameState.player1.tempDefense = 0; // Reset defense
                }
                if (isCritical) damage = Math.floor(damage * 1.4);
                player1.health = Math.max(0, player1.health - damage);
                actionResult = `🔮 Data Mage attacks for ${damage} damage!${isCritical ? ' 💥 CRITICAL!' : ''}`;
                break;
                
            case 'defend':
                actionResult = `🛡️ Data Mage casts Volatility Shield (preparing defense)`;
                this.gameState.player2.tempDefense = Math.floor(player2.defense * 0.3);
                break;
                
            case 'special':
                damage = Math.floor(40 * Math.max(0.7, ethMultiplier) * 1.6);
                if (isCritical) damage = Math.floor(damage * 1.3);
                player1.health = Math.max(0, player1.health - damage);
                actionResult = `✨ Data Mage uses Chaos Surge for ${damage} damage!${isCritical ? ' 💥 DEVASTATING!' : ''}`;
                break;
        }
        
        this.addLogEntry(actionResult);
        this.updateHealthBars();
        
        // Check for battle end
        if (player1.health <= 0) {
            await this.delay(1000);
            this.endBattle('player2');
            return;
        }
        
        // Return turn to player
        await this.delay(1500);
        this.gameState.currentTurn = 'player1';
        document.getElementById('currentTurn').textContent = 'Your Turn';
        this.setActionButtonsEnabled(true);
        this.startTurnTimer();
    }
    
    endBattle(winner) {
        this.gameState.inBattle = false;
        const totalStake = this.gameState.player1.stake + this.gameState.player2.stake;
        
        // Clear turn timer
        if (this.turnInterval) {
            clearInterval(this.turnInterval);
            this.turnInterval = null;
        }
        
        if (winner === 'player1') {
            this.addLogEntry(`🎉 VICTORY! You won ${totalStake.toFixed(2)} ETH!`);
            this.addLogEntry('💎 Initiating cross-chain swap for winnings...');
            this.addLogEntry('✅ Winnings transferred to your wallet!');
            // Update balance
            this.wallet.ethBalance += totalStake;
        } else {
            this.addLogEntry(`💀 DEFEAT! Opponent won ${totalStake.toFixed(2)} ETH.`);
            this.addLogEntry('Better luck next time, warrior!');
        }
        
        this.addLogEntry('📊 Battle statistics recorded on-chain');
        
        // Update wallet display
        this.updateWalletDisplay();
        
        // Reset battle state after delay
        setTimeout(() => {
            this.resetBattle();
        }, 5000);
    }
    
    resetBattle() {
        this.gameState.player1.health = this.gameState.player1.maxHealth;
        this.gameState.player2.health = this.gameState.player2.maxHealth;
        this.gameState.currentTurn = 'player1';
        this.gameState.player1.tempDefense = 0;
        this.gameState.player2.tempDefense = 0;
        
        this.updateHealthBars();
        
        const joinBtn = document.getElementById('joinBattleBtn');
        joinBtn.textContent = 'Join Battle Queue';
        joinBtn.disabled = false;
        
        document.getElementById('currentTurn').textContent = 'Ready to Battle';
        document.getElementById('turnTimer').textContent = '30s';
        
        // Reset action buttons
        this.setActionButtonsEnabled(false);
        
        this.addLogEntry('⚡ Battle reset - Ready for next match!');
    }
    
    setActionButtonsEnabled(enabled) {
        document.getElementById('attackBtn').disabled = !enabled;
        document.getElementById('defendBtn').disabled = !enabled;
        document.getElementById('specialBtn').disabled = !enabled;
    }
    
    updateHealthBars() {
        const player1Health = document.getElementById('player1Health');
        const player1Bar = document.getElementById('player1HealthBar');
        const player2Health = document.getElementById('player2Health');
        const player2Bar = document.getElementById('player2HealthBar');
        
        player1Health.textContent = this.gameState.player1.health;
        player1Bar.style.width = `${(this.gameState.player1.health / this.gameState.player1.maxHealth) * 100}%`;
        
        player2Health.textContent = this.gameState.player2.health;
        player2Bar.style.width = `${(this.gameState.player2.health / this.gameState.player2.maxHealth) * 100}%`;
        
        // Update health bar colors based on health percentage
        const p1HealthPercent = this.gameState.player1.health / this.gameState.player1.maxHealth;
        const p2HealthPercent = this.gameState.player2.health / this.gameState.player2.maxHealth;
        
        player1Bar.style.filter = p1HealthPercent < 0.25 ? 'hue-rotate(0deg)' : 
                                  p1HealthPercent < 0.5 ? 'hue-rotate(30deg)' : 'hue-rotate(120deg)';
        player2Bar.style.filter = p2HealthPercent < 0.25 ? 'hue-rotate(0deg)' : 
                                  p2HealthPercent < 0.5 ? 'hue-rotate(30deg)' : 'hue-rotate(120deg)';
    }
    
    updateBattleUI() {
        document.getElementById('player1Stake').textContent = `${this.gameState.player1.stake} ETH`;
        document.getElementById('player2Stake').textContent = `${this.gameState.player2.stake} ETH`;
    }
    
    startTurnTimer() {
        this.gameState.turnTimeLeft = 30;
        const timerElement = document.getElementById('turnTimer');
        
        this.turnInterval = setInterval(() => {
            this.gameState.turnTimeLeft--;
            timerElement.textContent = `${this.gameState.turnTimeLeft}s`;
            
            if (this.gameState.turnTimeLeft <= 0) {
                clearInterval(this.turnInterval);
                this.turnInterval = null;
                if (this.gameState.inBattle && this.gameState.currentTurn === 'player1') {
                    this.addLogEntry('⏰ Turn timeout - auto-defend activated');
                    this.performAction('defend');
                }
            }
        }, 1000);
    }
    
    updateStakeAmount(amount) {
        this.addLogEntry(`💰 Stake amount updated to ${amount} ETH`);
    }
    
    // VRF Loot Box System
    async openLootBox() {
        if (!this.wallet.connected) {
            this.addLogEntry('❌ Connect wallet to open loot boxes');
            return;
        }
        
        if (this.wallet.supraBalance < 10) {
            this.addLogEntry('❌ Insufficient SUPRA balance (need 10 SUPRA)');
            return;
        }
        
        const lootBtn = document.getElementById('openLootBox');
        lootBtn.textContent = 'Opening...';
        lootBtn.disabled = true;
        
        this.addLogEntry('🎰 Opening loot box with Supra VRF...');
        this.addLogEntry('🔄 Requesting verifiable randomness...');
        
        // Simulate VRF request with visual updates
        this.vrfData.nonce++;
        this.vrfData.randomSeed = '0x' + Math.random().toString(16).substr(2, 8) + '...';
        
        // Update VRF display immediately
        document.getElementById('vrfNonce').textContent = this.vrfData.nonce;
        document.getElementById('randomSeed').textContent = this.vrfData.randomSeed;
        
        await this.delay(3000);
        
        // Simulate random loot based on probabilities with VRF
        const vrfRandom = Math.random();
        let reward = '';
        let rewardValue = '';
        
        if (vrfRandom < 0.05) {
            reward = '🗡️ Legendary Sword';
            rewardValue = '+15 attack permanently';
            this.gameState.player1.attack += 15;
        } else if (vrfRandom < 0.15) {
            reward = '💎 Rare Crystal';
            rewardValue = '+50 SUPRA tokens';
            this.wallet.supraBalance += 50;
        } else if (vrfRandom < 0.30) {
            reward = '⚡ Power Core';
            rewardValue = '+10 attack for next battle';
        } else if (vrfRandom < 0.50) {
            reward = '💊 Health Elixir';
            rewardValue = 'Full health restore';
            this.gameState.player1.health = this.gameState.player1.maxHealth;
        } else {
            reward = '💰 Token Reward';
            rewardValue = '+5 SUPRA';
            this.wallet.supraBalance += 5;
        }
        
        // Deduct cost and update balance
        this.wallet.supraBalance -= 10;
        this.updateWalletDisplay();
        
        this.addLogEntry(`🎉 Loot box opened! Reward: ${reward}`);
        this.addLogEntry(`✨ Bonus: ${rewardValue}`);
        this.addLogEntry(`🔗 VRF proof available on-chain (nonce: ${this.vrfData.nonce})`);
        
        // Update player stats display if needed
        if (reward.includes('Sword')) {
            document.getElementById('player1Attack').textContent = this.gameState.player1.attack;
        }
        if (reward.includes('Elixir')) {
            this.updateHealthBars();
        }
        
        // Reset button
        lootBtn.textContent = 'Open Loot Box';
        lootBtn.disabled = false;
    }
    
    // Tournament System
    startTournamentCountdown() {
        const updateCountdown = () => {
            // Simulate countdown to next tournament (tomorrow at midnight)
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const timeLeft = tomorrow - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            document.getElementById('tournamentCountdown').textContent = `${hours}h ${minutes}m`;
        };
        
        updateCountdown();
        const interval = setInterval(updateCountdown, 60000); // Update every minute
        this.updateIntervals.push(interval);
    }
    
    // Battle Log Management
    addLogEntry(message) {
        const log = document.getElementById('battleLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        entry.innerHTML = `
            <span class="log-time">${timeStr}</span>
            <span class="log-action">${message}</span>
        `;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        
        // Keep only last 100 entries
        while (log.children.length > 100) {
            log.removeChild(log.firstChild);
        }
    }
    
    clearBattleLog() {
        document.getElementById('battleLog').innerHTML = '';
        this.addLogEntry('📝 Battle log cleared');
    }
    
    // Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Cleanup
    destroy() {
        this.updateIntervals.forEach(interval => clearInterval(interval));
        if (this.turnInterval) {
            clearInterval(this.turnInterval);
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.oracleArena = new OracleArena();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.oracleArena) {
        window.oracleArena.destroy();
    }
});