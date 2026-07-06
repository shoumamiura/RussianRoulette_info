/**
 * Cyber Buckshot: Game Engine & Logic
 */

// ゲームの状態管理（Game State）
const state = {
    mode: 'pve', // 'pve' or 'pvp'
    activePlayer: 'p1', // 'p1' or 'p2'
    isBusy: false, // Prevents multiple rapid clicks
    cylinder: [], // Array of 'live' or 'blank'
    totalLive: 0,
    totalBlank: 0,
    itemsUsedCount: 0,
    heartbeatInterval: null,
    aiKnowsNext: null, // 'live' or 'blank' or null
    difficulty: 'normal', // 'easy' or 'normal' or 'hard'
    players: {
        p1: {
            name: 'PLAYER 1',
            hp: 5,
            maxHp: 5,
            items: { scan: 1, heal: 1, cork: 1 },
            corkCD: 0, // Cool down in turns
            scanCD: 0, // Scan cool down in turns
            corkActive: false
        },
        p2: {
            name: 'DEALER',
            hp: 5,
            maxHp: 5,
            items: { scan: 1, heal: 1, cork: 1 },
            corkCD: 0,
            scanCD: 0,
            corkActive: false
        }
    }
};

// DOM要素の取得（DOM Elements）
const elements = {
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    blackoutScreen: document.getElementById('blackout-screen'),
    scanPopup: document.getElementById('scan-popup'),
    resultScreen: document.getElementById('result-screen'),
    
    // Names and Bars
    playName: document.getElementById('play-name'),
    playHpBar: document.getElementById('play-hp-bar'),
    playCorkBadge: document.getElementById('play-cork-badge'),
    oppName: document.getElementById('opp-name'),
    oppHpBar: document.getElementById('opp-hp-bar'),
    oppCorkBadge: document.getElementById('opp-cork-badge'),
    
    // Hands
    playHand: document.getElementById('play-hand'),
    oppHand: document.getElementById('opp-hand'),
    
    // Play Hand Items
    btnScan: document.getElementById('btn-item-scan'),
    btnHeal: document.getElementById('btn-item-heal'),
    btnCork: document.getElementById('btn-item-cork'),
    playScanCount: document.getElementById('play-item-scan-count'),
    playHealCount: document.getElementById('play-item-heal-count'),
    playCorkCount: document.getElementById('play-item-cork-count'),
    playCorkCD: document.getElementById('play-cork-cd'),
    playScanCD: document.getElementById('play-scan-cd'),
    
    // Opponent Hand Items
    oppScanCount: document.getElementById('opp-item-scan-count'),
    oppHealCount: document.getElementById('opp-item-heal-count'),
    oppCorkCount: document.getElementById('opp-item-cork-count'),
    oppCorkCD: document.getElementById('opp-cork-cd'),
    oppScanCD: document.getElementById('opp-scan-cd'),
    oppCorkSlot: document.getElementById('opp-cork-slot'),

    // Deck & Weapons
    liveCount: document.getElementById('live-count'),
    blankCount: document.getElementById('blank-count'),
    reloadMessage: document.getElementById('reload-message'),
    shotgunWrapper: document.getElementById('shotgun-wrapper'),
    muzzleFlash: document.getElementById('muzzle-flash'),
    logContent: document.getElementById('log-content'),
    btnShootOpp: document.getElementById('btn-shoot-opp'),
    btnShootSelf: document.getElementById('btn-shoot-self'),
    
    // Inputs
    modePve: document.getElementById('mode-pve'),
    modePvp: document.getElementById('mode-pvp'),
    p1NameInput: document.getElementById('p1-name-input'),
    p2NameInput: document.getElementById('p2-name-input'),
    p2InputGroup: document.getElementById('p2-input-group'),
    historyList: document.getElementById('history-list'),
    
    // Results
    winnerName: document.getElementById('winner-name'),
    winnerHealth: document.getElementById('winner-health'),
    itemsUsed: document.getElementById('items-used'),
    resultHistoryList: document.getElementById('result-history-list'),
    
    // Scanner
    scanResultText: document.getElementById('scan-result-text'),
    scanPvpWarning: document.getElementById('scan-pvp-warning'),
    scanPeekContainer: document.getElementById('scan-peek-container'),
    btnScanPeek: document.getElementById('btn-scan-peek'),
    btnScanClose: document.getElementById('btn-scan-close'),
    
    // Difficulty Selector
    difficultyArea: document.getElementById('difficulty-area')
};

// アプリケーションの初期化処理
window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    setupHeartbeatTrigger();
});

// モード選択処理（PvE / PvP）
function selectMode(mode) {
    state.mode = mode;
    if (mode === 'pve') {
        elements.modePve.classList.add('active');
        elements.modePvp.classList.remove('active');
        elements.p2InputGroup.style.display = 'none';
        elements.difficultyArea.style.display = 'flex';
        elements.p1NameInput.previousElementSibling.textContent = 'PLAYER 1 名前';
    } else {
        elements.modePve.classList.remove('active');
        elements.modePvp.classList.add('active');
        elements.p2InputGroup.style.display = 'flex';
        elements.difficultyArea.style.display = 'none';
        elements.p1NameInput.previousElementSibling.textContent = 'PLAYER 1 名前';
    }
    sound.init(); // Warm up audio context
}

// 難易度選択処理（EASY / NORMAL / HARD）
function selectDifficulty(diff) {
    state.difficulty = diff;
    for (const d of ['easy', 'normal', 'hard']) {
        const btn = document.getElementById(`diff-${d}`);
        if (btn) {
            if (d === diff) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    }
    // Synthesize quick click feedback
    sound.init();
    if (sound.ctx) {
        sound.playClick(sound.ctx.currentTime, 1500, 0.05);
    }
}

// ゲーム開始のセットアップ処理
function startGame() {
    sound.init();
    
    // Set Player Names
    state.players.p1.name = elements.p1NameInput.value.trim() || 'PLAYER 1';
    if (state.mode === 'pvp') {
        state.players.p2.name = elements.p2NameInput.value.trim() || 'PLAYER 2';
    } else {
        const diffLabels = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
        state.players.p2.name = `DEALER (${diffLabels[state.difficulty]})`;
    }

    // Reset Player Stats
    for (const key of ['p1', 'p2']) {
        state.players[key].hp = 5;
        state.players[key].maxHp = 5;
        
        // Give AI an item advantage in Hard mode
        if (key === 'p2' && state.mode === 'pve' && state.difficulty === 'hard') {
            state.players[key].items = { scan: 2, heal: 2, cork: 1 };
        } else {
            state.players[key].items = { scan: 1, heal: 1, cork: 1 };
        }
        
        state.players[key].corkCD = 0;
        state.players[key].scanCD = 0;
        state.players[key].corkActive = false;
    }
    
    state.activePlayer = 'p1';
    state.itemsUsedCount = 0;
    state.isBusy = false;
    state.aiKnowsNext = null;
    state.cylinder = [];
    
    writeLog("バトル開始！");

    // Transition Screens
    elements.startScreen.classList.remove('active');
    elements.gameScreen.classList.add('active');
    
    // Init game sequence
    reloadCylinder(() => {
        updateUI();
    });
}

// シリンダーにランダムな弾（実弾・空砲）を装填する処理
function reloadCylinder(callback) {
    state.isBusy = true;
    elements.reloadMessage.classList.add('active');
    sound.playReload();
    
    writeLog("シリンダーをリロード中...");
    
    setTimeout(() => {
        // Random shell count: 2 to 6 shells
        const totalShells = Math.floor(Math.random() * 5) + 2; // 2,3,4,5,6
        // Ensure at least 1 live and 1 blank if total >= 2
        let liveCount = 0;
        if (totalShells === 2) {
            liveCount = 1;
        } else {
            // Random live count between 1 and totalShells - 1
            liveCount = Math.floor(Math.random() * (totalShells - 1)) + 1;
        }
        const blankCount = totalShells - liveCount;
        
        state.totalLive = liveCount;
        state.totalBlank = blankCount;
        
        // Populate and shuffle cylinder
        const bullets = [];
        for (let i = 0; i < liveCount; i++) bullets.push('live');
        for (let i = 0; i < blankCount; i++) bullets.push('blank');
        
        // Fisher-Yates Shuffle
        for (let i = bullets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bullets[i], bullets[j]] = [bullets[j], bullets[i]];
        }
        
        state.cylinder = bullets;
        state.aiKnowsNext = null; // Clear AI memory of next bullet
        
        elements.reloadMessage.classList.remove('active');
        state.isBusy = false;
        
        writeLog(`リロード完了：実弾 ${liveCount} 発、空砲 ${blankCount} 発`);
        
        if (callback) callback();
    }, 1800);
}

// ターンに基づいてUIパネルを更新する処理
function updateUI() {
    const act = state.activePlayer;
    const opp = act === 'p1' ? 'p2' : 'p1';
    
    const activeData = state.players[act];
    const oppData = state.players[opp];
    
    // 1. Update Names & Cork Badges
    elements.playName.textContent = activeData.name;
    elements.oppName.textContent = oppData.name;
    
    if (activeData.corkActive) {
        elements.playCorkBadge.classList.add('active');
    } else {
        elements.playCorkBadge.classList.remove('active');
    }
    
    if (oppData.corkActive) {
        elements.oppCorkBadge.classList.add('active');
    } else {
        elements.oppCorkBadge.classList.remove('active');
    }
    
    // 2. Update HP Bars
    renderHpBar(elements.playHpBar, activeData.hp, activeData.maxHp);
    renderHpBar(elements.oppHpBar, oppData.hp, oppData.maxHp);
    
    // 3. Bullet Counts
    elements.liveCount.textContent = state.totalLive;
    elements.blankCount.textContent = state.totalBlank;
    
    // 4. Update Hand Items (Active Player)
    elements.playScanCount.textContent = activeData.items.scan;
    elements.playHealCount.textContent = activeData.items.heal;
    elements.playCorkCount.textContent = activeData.items.cork;
    
    // Active player item button availability
    toggleItemButton(elements.btnHeal, activeData.items.heal > 0 && activeData.hp < activeData.maxHp);
    
    // Scan Cooldown display
    if (elements.playScanCD) {
        if (activeData.scanCD > 0) {
            elements.playScanCD.textContent = activeData.scanCD;
            elements.playScanCD.classList.add('active');
            toggleItemButton(elements.btnScan, false);
        } else {
            elements.playScanCD.classList.remove('active');
            toggleItemButton(elements.btnScan, activeData.items.scan > 0);
        }
    }
    
    // Cork Cooldown display
    if (elements.playCorkCD) {
        if (activeData.corkCD > 0) {
            elements.playCorkCD.textContent = activeData.corkCD;
            elements.playCorkCD.classList.add('active');
            toggleItemButton(elements.btnCork, false);
        } else {
            elements.playCorkCD.classList.remove('active');
            toggleItemButton(elements.btnCork, activeData.items.cork > 0);
        }
    }
    
    // 5. Update Opponent Hand Items
    if (state.mode === 'pvp') {
        // PvP: Hide opponent hand completely (blackout processing)
        elements.oppHand.classList.add('disabled-turn');
        elements.oppScanCount.textContent = '?';
        elements.oppHealCount.textContent = '?';
        elements.oppCorkCount.textContent = '?';
        elements.oppCorkCD?.classList.remove('active');
        elements.oppScanCD?.classList.remove('active');
    } else {
        // PvE: Show dealer hand but keep it disabled (not clickable)
        elements.oppHand.classList.remove('disabled-turn');
        elements.oppScanCount.textContent = oppData.items.scan;
        elements.oppHealCount.textContent = oppData.items.heal;
        elements.oppCorkCount.textContent = oppData.items.cork;
        
        if (oppData.corkCD > 0) {
            if (elements.oppCorkCD) {
                elements.oppCorkCD.textContent = oppData.corkCD;
                elements.oppCorkCD.classList.add('active');
            }
        } else {
            elements.oppCorkCD?.classList.remove('active');
        }
        
        if (oppData.scanCD > 0) {
            if (elements.oppScanCD) {
                elements.oppScanCD.textContent = oppData.scanCD;
                elements.oppScanCD.classList.add('active');
            }
        } else {
            elements.oppScanCD?.classList.remove('active');
        }
    }
    
    // Apply turn-active visual feedback
    document.getElementById('player-panel').classList.add('active-turn');
    document.getElementById('opponent-panel').classList.remove('active-turn');
    
    // Disable action buttons if busy or it is AI turn
    const isAiTurn = (state.mode === 'pve' && state.activePlayer === 'p2');
    const disabled = state.isBusy || isAiTurn;
    
    elements.btnShootOpp.disabled = disabled;
    elements.btnShootSelf.disabled = disabled;
    
    // If AI Turn, trigger Dealer logic
    if (isAiTurn && !state.isBusy) {
        setTimeout(dealerPlay, 1000);
    }
}

// HP Heart Bar Renderer
function renderHpBar(container, hp, maxHp) {
    container.innerHTML = '';
    for (let i = 0; i < maxHp; i++) {
        const dot = document.createElement('div');
        dot.className = 'hp-dot';
        if (i < hp) {
            dot.classList.add('active');
        }
        container.appendChild(dot);
    }
}

function toggleItemButton(button, enable) {
    if (enable) {
        button.classList.remove('disabled');
        button.removeAttribute('disabled');
    } else {
        button.classList.add('disabled');
        button.setAttribute('disabled', 'true');
    }
}

// Log utility
function writeLog(text) {
    elements.logContent.textContent = text;
}

// Trigger screen shaking on damage
function triggerScreenEffect(type) {
    const main = document.getElementById('game-container');
    if (type === 'damage') {
        main.classList.add('screen-shake');
        setTimeout(() => main.classList.remove('screen-shake'), 300);
        
        // Shake specific HP bar
        const targetBar = state.activePlayer === 'p1' ? elements.playHpBar : elements.oppHpBar;
        targetBar.classList.add('shake');
        setTimeout(() => targetBar.classList.remove('shake'), 400);
    }
}

// ----------------------------------------------------
// SHOOTING LOGIC
// ----------------------------------------------------
function shoot(target) {
    if (state.isBusy) return;
    
    const activeData = state.players[state.activePlayer];
    const oppKey = state.activePlayer === 'p1' ? 'p2' : 'p1';
    const oppData = state.players[oppKey];
    
    state.isBusy = true;
    
    // Update Shotgun Direction
    elements.shotgunWrapper.className = '';
    if (target === 'opponent') {
        elements.shotgunWrapper.classList.add('shotgun-pos-opp');
        // Custom CSS property for correct kickback angle
        elements.shotgunWrapper.style.setProperty('--current-rot', '-35deg');
        writeLog(`${activeData.name} は銃を ${oppData.name} に向けた...`);
    } else {
        elements.shotgunWrapper.classList.add('shotgun-pos-self');
        elements.shotgunWrapper.style.setProperty('--current-rot', '145deg');
        writeLog(`${activeData.name} は銃をご自身に向けた...`);
    }
    
    // Disable inputs
    elements.btnShootOpp.disabled = true;
    elements.btnShootSelf.disabled = true;
    
    setTimeout(() => {
        // Fire shotgun kickback animation
        elements.shotgunWrapper.classList.add('firing');
        
        // Pull Bullet
        const bullet = state.cylinder.shift();
        
        if (bullet === 'live') {
            // LIVE ROUND
            state.totalLive--;
            sound.playShot();
            
            // Flash muzzle
            elements.muzzleFlash.classList.add('animate');
            triggerScreenEffect('damage');
            
            setTimeout(() => {
                elements.muzzleFlash.classList.remove('animate');
            }, 250);
            
            // Apply Damage
            const damageTarget = target === 'opponent' ? oppKey : state.activePlayer;
            state.players[damageTarget].hp = Math.max(0, state.players[damageTarget].hp - 1);
            
            writeLog(`実弾！ ${state.players[damageTarget].name} に 1 ダメージ！`);
            
            // Clear cork traps if damage occurs
            state.players.p1.corkActive = false;
            state.players.p2.corkActive = false;
            
            setTimeout(() => {
                elements.shotgunWrapper.className = 'shotgun-pos-center';
                elements.shotgunWrapper.classList.remove('firing');
                
                if (checkGameOver()) return;
                
                // Switch turn because damage was dealt
                switchTurn();
            }, 1200);
            
        } else {
            // BLANK ROUND
            state.totalBlank--;
            sound.playBlank();
            
            writeLog("空砲！ 乾いた撃鉄の音が響いた。");
            
            setTimeout(() => {
                elements.shotgunWrapper.className = 'shotgun-pos-center';
                elements.shotgunWrapper.classList.remove('firing');
                
                // CHECK CORK EXPLOSION TRAP
                // If shooter shot themselves AND opponent had active cork trap
                if (target === 'self' && oppData.corkActive) {
                    // Cork explosion! Trigger live shot sound & muzzle flash, deal damage
                    setTimeout(() => {
                        writeLog(`暴発！ ${oppData.name} のコルク栓により銃身が破裂した！`);
                        sound.playShot();
                        elements.muzzleFlash.classList.add('animate');
                        triggerScreenEffect('damage');
                        
                        setTimeout(() => {
                            elements.muzzleFlash.classList.remove('animate');
                        }, 250);
                        
                        // Shooter takes damage
                        activeData.hp = Math.max(0, activeData.hp - 1);
                        oppData.corkActive = false; // Trap consumed
                        
                        setTimeout(() => {
                            if (checkGameOver()) return;
                            // Turn ends because damage was received
                            switchTurn();
                        }, 1200);
                        
                    }, 800);
                    
                } else {
                    // Normal Blank flow
                    if (target === 'self') {
                        // Shoot self and blank = retain turn!
                        writeLog(`${activeData.name} のターン継続！`);
                        state.isBusy = false;
                        
                        // Check if cylinder is empty
                        if (state.cylinder.length === 0 || state.totalLive === 0) {
                            reloadCylinder(() => {
                                updateUI();
                            });
                        } else {
                            updateUI();
                        }
                    } else {
                        // Shoot opponent and blank = lose turn
                        switchTurn();
                    }
                }
            }, 1000);
        }
    }, 800);
}

// ----------------------------------------------------
// ITEM USAGE LOGIC
// ----------------------------------------------------
function useItem(itemType) {
    if (state.isBusy) return;
    
    const activeData = state.players[state.activePlayer];
    if (activeData.items[itemType] <= 0) return;
    
    // Custom check for cork cooldown
    if (itemType === 'cork' && activeData.corkCD > 0) return;
    
    state.isBusy = true;
    state.itemsUsedCount++;
    
    if (itemType === 'scan') {
        // SCAN (虫眼鏡)
        activeData.items.scan--;
        activeData.scanCD = 3; // 3 turns cooldown
        sound.playScan();
        
        const nextBullet = state.cylinder[0];
        
        if (state.mode === 'pvp') {
            // PVP: Display scanner with secret interactive peek button
            elements.scanResultText.textContent = "???";
            elements.scanResultText.className = "scan-result-neon masked-bullet";
            elements.scanPvpWarning.style.display = 'block';
            elements.scanPeekContainer.style.display = 'block';
            elements.scanPopup.style.display = 'flex';
            elements.scanPopup.classList.add('active');
            
            // Store next bullet value locally on button data
            elements.btnScanPeek.dataset.bullet = nextBullet;
        } else {
            // PVE: Show immediately
            showScanPveResult(nextBullet);
        }
        
        writeLog(`${activeData.name} は虫眼鏡で次の弾を覗いた。`);
        
    } else if (itemType === 'heal') {
        // BANDAGE (包帯)
        if (activeData.hp >= activeData.maxHp) {
            state.isBusy = false;
            return; // Can't heal at max HP
        }
        activeData.items.heal--;
        activeData.hp = Math.min(activeData.maxHp, activeData.hp + 1);
        sound.playHeal();
        
        writeLog(`${activeData.name} は包帯を巻き、ライフを1回復した。`);
        
        setTimeout(() => {
            state.isBusy = false;
            updateUI();
        }, 800);
        
    } else if (itemType === 'cork') {
        // CORK (コルク栓)
        activeData.items.cork--;
        activeData.corkActive = true;
        activeData.corkCD = 3; // 3 turns cooldown
        sound.playCork();
        
        writeLog(`${activeData.name} は銃口にコルク栓を詰め込んだ！`);
        
        setTimeout(() => {
            switchTurn(); // Switch turn after using cork
        }, 800);
    }
}

// Interactive Peek for PvP
function showScanPeek() {
    const bullet = elements.btnScanPeek.dataset.bullet;
    if (bullet === 'live') {
        elements.scanResultText.textContent = "実弾 (LIVE)";
        elements.scanResultText.className = "scan-result-neon live-bullet";
    } else {
        elements.scanResultText.textContent = "空砲 (BLANK)";
        elements.scanResultText.className = "scan-result-neon blank-bullet";
    }
}

function hideScanPeek() {
    elements.scanResultText.textContent = "???";
    elements.scanResultText.className = "scan-result-neon masked-bullet";
}

function showScanPveResult(bullet) {
    if (bullet === 'live') {
        elements.scanResultText.textContent = "実弾 (LIVE)";
        elements.scanResultText.className = "scan-result-neon live-bullet";
    } else {
        elements.scanResultText.textContent = "空砲 (BLANK)";
        elements.scanResultText.className = "scan-result-neon blank-bullet";
    }
    elements.scanPvpWarning.style.display = 'none';
    elements.scanPeekContainer.style.display = 'none';
    elements.scanPopup.style.display = 'flex';
    elements.scanPopup.classList.add('active');
}

function closeScanPopup() {
    elements.scanPopup.classList.remove('active');
    setTimeout(() => {
        elements.scanPopup.style.display = 'none';
        state.isBusy = false;
        updateUI();
    }, 300);
}

// ----------------------------------------------------
// TURN TRANSITION SYSTEM
// ----------------------------------------------------
function switchTurn() {
    // If cylinder empty or all live bullets fired, trigger reload first
    if (state.cylinder.length === 0 || state.totalLive === 0) {
        reloadCylinder(() => {
            proceedSwitch();
        });
    } else {
        proceedSwitch();
    }
}

function proceedSwitch() {
    const nextPlayer = state.activePlayer === 'p1' ? 'p2' : 'p1';
    
    // Clear cork active status of the player whose turn just ended (since trap was not triggered)
    state.players[state.activePlayer].corkActive = false;
    
    // Update Cooldowns for the player gaining turn
    if (state.players[nextPlayer].corkCD > 0) {
        state.players[nextPlayer].corkCD--;
        if (state.players[nextPlayer].corkCD === 0) {
            // Auto reload cork to hand
            state.players[nextPlayer].items.cork = 1;
        }
    }
    if (state.players[nextPlayer].scanCD > 0) {
        state.players[nextPlayer].scanCD--;
        if (state.players[nextPlayer].scanCD === 0) {
            // Auto reload scan to hand
            state.players[nextPlayer].items.scan = 1;
        }
    }
    
    state.activePlayer = nextPlayer;
    
    // If PVP mode: Trigger Intermission Screen to hide player secrets
    if (state.mode === 'pvp') {
        elements.blackoutMessage.textContent = `${state.players[nextPlayer].name} のターンです。`;
        elements.blackoutScreen.classList.add('active');
    } else {
        // PVE: Seamless update
        state.isBusy = false;
        updateUI();
    }
}

function dismissBlackout() {
    elements.blackoutScreen.classList.remove('active');
    state.isBusy = false;
    updateUI();
}

// ----------------------------------------------------
// AI / DEALER DECISION MAKING (PVE ONLY)
// ----------------------------------------------------
function dealerPlay() {
    if (state.activePlayer !== 'p2' || state.isBusy) return;
    
    const ai = state.players.p2;
    const human = state.players.p1;
    
    // Step 1: Decision on Items
    // A: Health bandage recovery if HP is low and has bandage
    if (ai.hp <= 3 && ai.items.heal > 0 && ai.hp < ai.maxHp) {
        writeLog("ディーラーが思考中...");
        setTimeout(() => {
            useItemByAi('heal');
        }, 800);
        return;
    }
    
    // B: Scan bullet check if scanner available
    if (ai.items.scan > 0 && ai.scanCD === 0 && state.aiKnowsNext === null) {
        writeLog("ディーラーが思考中...");
        setTimeout(() => {
            useItemByAi('scan');
        }, 800);
        return;
    }
    
    // C: Set Cork trap if available and cooldown is 0
    if (ai.items.cork > 0 && ai.corkCD === 0 && !ai.corkActive && Math.random() > 0.4) {
        writeLog("ディーラーが思考中...");
        setTimeout(() => {
            useItemByAi('cork');
        }, 800);
        return;
    }
    
    // Step 2: Shooting Decision
    let target = 'opponent';
    const nextBulletKnown = state.aiKnowsNext;
    
    if (nextBulletKnown !== null) {
        // AI knows the exact next bullet!
        if (nextBulletKnown === 'live') {
            target = 'opponent'; // Shoot human
        } else {
            // Next is blank. Shoot self for turn retention (will trigger cork explosion if human set trap)
            target = 'self';
        }
    } else {
        // AI doesn't know. Calculate probabilities.
        const liveProb = state.totalLive / state.cylinder.length;
        
        if (liveProb > 0.5) {
            target = 'opponent';
        } else {
            // High blank probability. Shoot self.
            target = 'self';
        }
    }
    
    // Execute shoot
    setTimeout(() => {
        shoot(target);
    }, 1000);
}

// Helper to simulate item usage by AI
function useItemByAi(itemType) {
    const ai = state.players.p2;
    state.itemsUsedCount++;
    
    if (itemType === 'heal') {
        ai.items.heal--;
        ai.hp = Math.min(ai.maxHp, ai.hp + 1);
        sound.playHeal();
        writeLog(`${ai.name} は包帯を使用し、ライフを1回復した。`);
    } else if (itemType === 'scan') {
        ai.items.scan--;
        ai.scanCD = 3; // Cooldown
        sound.playScan();
        // AI remembers the next bullet
        state.aiKnowsNext = state.cylinder[0];
        writeLog(`${ai.name} は虫眼鏡で次の弾をスキャンした。`);
    } else if (itemType === 'cork') {
        ai.items.cork--;
        ai.corkActive = true;
        ai.corkCD = 3;
        sound.playCork();
        writeLog(`${ai.name} は銃口にコルク栓を詰め込んだ！`);
        
        setTimeout(() => {
            switchTurn(); // Turn switch for AI cork usage
        }, 1000);
        return; // End AI execution loop for this turn
    }
    
    setTimeout(() => {
        updateUI();
    }, 1000);
}

// ----------------------------------------------------
// GAME OVER & HISTORY
// ----------------------------------------------------
function checkGameOver() {
    const p1 = state.players.p1;
    const p2 = state.players.p2;
    
    if (p1.hp <= 0 || p2.hp <= 0) {
        clearInterval(state.heartbeatInterval);
        state.heartbeatInterval = null;
        
        const winner = p1.hp > 0 ? p1 : p2;
        const loser = p1.hp > 0 ? p2 : p1;
        
        // Show result screen
        elements.winnerName.textContent = winner.name;
        elements.winnerHealth.textContent = winner.hp;
        elements.itemsUsed.textContent = state.itemsUsedCount;
        
        // Save to History
        saveMatchResult(winner.name, loser.name, state.mode, winner.hp);
        
        // Transition Screen
        elements.gameScreen.classList.remove('active');
        elements.resultScreen.classList.add('active');
        
        loadHistory(); // Reload visual list
        return true;
    }
    return false;
}

function saveMatchResult(winner, loser, mode, winnerHp) {
    const history = JSON.parse(localStorage.getItem('buckshot_history')) || [];
    const date = new Date();
    const formattedDate = `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    
    history.unshift({
        date: formattedDate,
        winner: winner,
        loser: loser,
        mode: mode === 'pvp' ? 'PLAYER vs PLAYER' : 'PLAYER vs AI',
        hp: winnerHp
    });
    
    // Cap history at 15 items
    if (history.length > 15) history.pop();
    
    localStorage.setItem('buckshot_history', JSON.stringify(history));
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('buckshot_history')) || [];
    
    // Draw in both Start and Result lists
    for (const listElement of [elements.historyList, elements.resultHistoryList]) {
        if (!listElement) continue;
        listElement.innerHTML = '';
        
        if (history.length === 0) {
            listElement.innerHTML = '<p class="no-history">履歴はありません</p>';
            continue;
        }
        
        history.forEach(item => {
            const row = document.createElement('div');
            row.className = `history-item ${item.mode.includes('PLAYER') && item.mode.includes('AI') ? '' : 'pvp'}`;
            row.innerHTML = `
                <span>${item.date} - [${item.mode}]</span>
                <span>勝者: <span class="winner">${item.winner}</span> (残りHP: ${item.hp})</span>
            `;
            listElement.appendChild(row);
        });
    }
}

function clearHistory() {
    localStorage.removeItem('buckshot_history');
    loadHistory();
}

// ----------------------------------------------------
// HEARTBEAT & GRAPHIC PULSE AT LOW LIFE (1 HP)
// ----------------------------------------------------
function setupHeartbeatTrigger() {
    // Check low life state periodically and trigger synthesizer sound
    setInterval(() => {
        if (!elements.gameScreen.classList.contains('active')) return;
        
        const lowLife = (state.players.p1.hp === 1 || state.players.p2.hp === 1);
        if (lowLife) {
            // Heartbeat audio synthezier
            sound.playHeartbeat();
            
            // Pulse the game screen border/grid visually
            const container = document.getElementById('game-container');
            container.style.boxShadow = '0 0 40px rgba(255, 0, 85, 0.25), inset 0 0 25px rgba(255, 0, 85, 0.15)';
            container.style.borderColor = 'rgba(255, 0, 85, 0.4)';
            
            setTimeout(() => {
                // Restore standard shadow after pulse
                if (elements.gameScreen.classList.contains('active')) {
                    container.style.boxShadow = '';
                    container.style.borderColor = '';
                }
            }, 500);
        }
    }, 2500);
}

// Screen controls
function restartGame() {
    elements.resultScreen.classList.remove('active');
    startGame();
}

function goBackToMenu() {
    elements.resultScreen.classList.remove('active');
    elements.gameScreen.classList.remove('active');
    elements.startScreen.classList.add('active');
}
