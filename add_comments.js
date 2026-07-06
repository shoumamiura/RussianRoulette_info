const fs = require('fs');
const path = require('path');

const gamePath = path.join(__dirname, 'game.js');
let gameContent = fs.readFileSync(gamePath, 'utf8');

const replacements = [
    { from: /\/\/ Game State/g, to: '// ゲームの状態管理（Game State）' },
    { from: /\/\/ DOM Elements/g, to: '// DOM要素の取得（DOM Elements）' },
    { from: /\/\/ Initialize Application/g, to: '// アプリケーションの初期化処理' },
    { from: /\/\/ Mode Selection/g, to: '// モード選択処理（PvE / PvP）' },
    { from: /\/\/ Difficulty Selection/g, to: '// 難易度選択処理（EASY / NORMAL / HARD）' },
    { from: /\/\/ Start Game Setup/g, to: '// ゲーム開始のセットアップ処理' },
    { from: /\/\/ Reload cylinder with random bullets/g, to: '// シリンダーにランダムな弾（実弾・空砲）を装填する処理' },
    { from: /\/\/ Update UI Panels based on Turn/g, to: '// ターンに基づいてUIパネルを更新する処理' },
    { from: /\/\/ Core Actions/g, to: '// コアアクション（発砲・アイテム使用など）' },
    { from: /\/\/ Handle Player Shooting/g, to: '// プレイヤーの発砲処理を制御' },
    { from: /\/\/ Item Usage/g, to: '// アイテム使用処理' },
    { from: /\/\/ Turn Management/g, to: '// ターン管理処理' },
    { from: /\/\/ Dealer \(AI\) Turn Logic/g, to: '// ディーラー（AI）のターン思考・行動ロジック' },
    { from: /\/\/ End Game & History/g, to: '// ゲーム終了処理と履歴保存' }
];

replacements.forEach(r => {
    gameContent = gameContent.replace(r.from, r.to);
});

// For sound.js
const soundPath = path.join(__dirname, 'sound.js');
let soundContent = fs.readFileSync(soundPath, 'utf8');

const soundReplacements = [
    { from: /\/\*\*[\s\S]*?\*\//g, to: (match) => {
        let text = match;
        text = text.replace(/Initialize AudioContext. Must be triggered by user interaction./, 'AudioContextの初期化。ユーザーアクションによってトリガーされる必要があります。');
        text = text.replace(/Toggle mute state/, 'ミュート（消音）状態の切り替え');
        text = text.replace(/Create a buffer filled with white noise/, 'ホワイトノイズで満たされたバッファを作成（発砲音などの基礎）');
        text = text.replace(/Live shot sound \(Explosive gunfire\)/, '実弾の発砲音（爆発的な銃声）');
        text = text.replace(/Blank shot sound \(Click\)/, '空砲の音（カチッという引き金の音）');
        text = text.replace(/Reload sound/, 'リロード（弾込め）の音');
        text = text.replace(/Item usage sounds/, 'アイテム使用時の音');
        text = text.replace(/Heartbeat sound effect/, '心音（ハートビート）の効果音。緊張感を高める');
        text = text.replace(/Cyber UI Click/, 'サイバー風のUIクリック音');
        return text;
    }}
];

soundReplacements.forEach(r => {
    soundContent = soundContent.replace(r.from, r.to);
});

fs.writeFileSync(gamePath, gameContent, 'utf8');
fs.writeFileSync(soundPath, soundContent, 'utf8');

console.log('Comments translated to Japanese successfully.');
