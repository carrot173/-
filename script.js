alert("JavaScript脚本已加载！");

// --- 全局状态变量 ---

let players = [];

let gameWords = { goodWord: "", wolfWord: "" };

// 计时器

let timerInterval = null; 

let totalSpeechTimeInSeconds = 60; 

let currentRemainingSeconds = 60; 

// 游戏流程

let currentPhase = "白天"; 

const fallbackNightActionOrderDefinition = ["狼人", "守卫", "预言家"]; 

let activeNightActions = []; 

let currentNightActionIndex = 0; 

// 用户自定义配置

let userDefinedRoles = {}; 

let userDefinedSetups = []; 

let currentSetupBeingDefined = { name: "", playerCount: 0, roles: {}, nightActionOrder: [] };

// 后备/默认角色配置

const fallbackRolesConfig = {

    WEREWOLF: { id: "WEREWOLF", name: "狼人", faction: "狼人阵营", wordSource: "wolf", hasNightAction: true, nightActionPrompt: "请所有 狼人 睁眼" },

    VILLAGER: { id: "VILLAGER", name: "平民", faction: "好人阵营", wordSource: "good", hasNightAction: false, nightActionPrompt: "" },

    SEER:     { id: "SEER", name: "预言家", faction: "好人阵营", wordSource: "good", hasNightAction: true, nightActionPrompt: "请 预言家 睁眼，选择一名玩家查验其身份。" },

    GUARD:    { id: "GUARD", name: "守卫", faction: "好人阵营", wordSource: "good", hasNightAction: true, nightActionPrompt: "请 守卫 睁眼，选择今晚要守护的一名玩家。" }

};

// --- localStorage 辅助函数 ---

const LS_ROLES_KEY = 'userDefinedRoles_狼人杀助手_v1'; // 添加版本号以备将来结构变化

const LS_SETUPS_KEY = 'userDefinedSetups_狼人杀助手_v1';

function saveDataToLocalStorage(key, data) {

    try {

        localStorage.setItem(key, JSON.stringify(data));

    } catch (e) {

        console.error("保存数据到localStorage失败:", key, e);

        alert("保存数据到本地存储失败，可能是存储已满或浏览器设置问题。");

    }

}

function loadDataFromLocalStorage(key) {

    try {

        const data = localStorage.getItem(key);

        return data ? JSON.parse(data) : null;

    } catch (e) {

        console.error("从localStorage加载数据失败:", key, e);

        localStorage.removeItem(key); // 如果解析失败，可能是数据损坏，移除它

        return null;

    }

}

// --- DOMContentLoaded: 页面加载完成后的初始化 ---

document.addEventListener('DOMContentLoaded', function() {

    // 加载保存的自定义数据

    userDefinedRoles = loadDataFromLocalStorage(LS_ROLES_KEY) || {};

    userDefinedSetups = loadDataFromLocalStorage(LS_SETUPS_KEY) || [];

    // 获取所有需要的HTML元素

    const goodWordInput = document.getElementById('goodWord');

    const wolfWordInput = document.getElementById('wolfWord');

    

    const roleIdInput = document.getElementById('roleIdInput');

    const roleNameInput = document.getElementById('roleNameInput');

    const roleFactionSelect = document.getElementById('roleFactionSelect');

    const roleWordSourceSelect = document.getElementById('roleWordSourceSelect');

    const roleHasNightActionCheckbox = document.getElementById('roleHasNightActionCheckbox');

    const roleNightActionPromptTextarea = document.getElementById('roleNightActionPromptTextarea');

    const addCustomRoleButton = document.getElementById('addCustomRoleButton');

    

    const setupNameInput = document.getElementById('setupNameInput');

    const setupPlayerCountInput = document.getElementById('setupPlayerCountInput');

    const setupRoleSelect = document.getElementById('setupRoleSelect');

    const setupRoleQuantityInput = document.getElementById('setupRoleQuantityInput');

    const addRoleToSetupButton = document.getElementById('addRoleToSetupButton');

    const setupNightActionOrderInput = document.getElementById('setupNightActionOrderInput');

    const saveCustomSetupButton = document.getElementById('saveCustomSetupButton');

    const selectGameSetup = document.getElementById('selectGameSetup');

    const playerCountDisplay = document.getElementById('playerCountDisplay');

    const generateRolesButton = document.getElementById('generateRolesButton');

    const speechDurationInput = document.getElementById('speechDuration');

    const startTimerButton = document.getElementById('startTimerButton');

    const stopTimerButton = document.getElementById('stopTimerButton');

    const resetTimerButton = document.getElementById('resetTimerButton');

    const enterNightButton = document.getElementById('enterNightButton');

    const nextNightActionButton = document.getElementById('nextNightActionButton');

    const enterDayButton = document.getElementById('enterDayButton');

    // 计票器UI元素

    const votePlayerIdInput = document.getElementById('votePlayerIdInput');

    const submitVoteButton = document.getElementById('submitVoteButton');

    const resetVotesButton = document.getElementById('resetVotesButton');

    // 初始化UI显示

    updateCustomRolesDisplay();

    populateSetupRoleSelect(); 

    updateCustomSetupsDisplay();

    populateGameSetupSelect(); 

    updateCurrentSetupRolesDisplay(); 

    // 事件监听

    if (addCustomRoleButton) addCustomRoleButton.addEventListener('click', handleAddCustomRole);

    if (addRoleToSetupButton) addRoleToSetupButton.addEventListener('click', handleAddRoleToCurrentSetup);

    if (saveCustomSetupButton) saveCustomSetupButton.addEventListener('click', handleSaveCustomSetup);

    

    if (selectGameSetup) {

        selectGameSetup.addEventListener('change', function() {

            const selectedSetupName = this.value;

            const selectedSetup = userDefinedSetups.find(s => s.name === selectedSetupName);

            if (playerCountDisplay) { // 确保元素存在

                 playerCountDisplay.value = selectedSetup ? selectedSetup.playerCount : "";

            }

        });

    }

    if (generateRolesButton) {

        generateRolesButton.addEventListener('click', function() {

            if (!goodWordInput || !wolfWordInput || !selectGameSetup) return; // 防御

            const goodWord = goodWordInput.value.trim();

            const wolfWord = wolfWordInput.value.trim();

            const selectedSetupName = selectGameSetup.value;

            if (goodWord === '' || wolfWord === '') { alert('请输入阵营词语！'); return; }

            if (!selectedSetupName) { alert('请选择一个板子配置！'); return; }

            

            const setupToUse = userDefinedSetups.find(s => s.name === selectedSetupName);

            if (!setupToUse) { alert('选择的板子无效！'); return; }

            

            setupGame(goodWord, wolfWord, setupToUse); 

        });

    }

    // 计票器事件监听

    if (submitVoteButton) submitVoteButton.addEventListener('click', handleSubmitVote);

    if (resetVotesButton) resetVotesButton.addEventListener('click', handleResetVotes);

    // 其他事件监听 (计时器, 流程控制)

    if (startTimerButton) startTimerButton.addEventListener('click', startTimer);

    if (stopTimerButton) stopTimerButton.addEventListener('click', stopTimer);

    if (resetTimerButton) resetTimerButton.addEventListener('click', resetTimer);

    if (speechDurationInput) {

        speechDurationInput.addEventListener('change', initializeTimer);

        initializeTimer(); 

    }

    if (enterNightButton) enterNightButton.addEventListener('click', enterNightPhase);

    if (nextNightActionButton) nextNightActionButton.addEventListener('click', advanceNightAction);

    if (enterDayButton) enterDayButton.addEventListener('click', enterDayPhase);

    updatePhaseDisplay(); 

    const nightActionPromptElement = document.getElementById('nightActionPrompt');

    if (nightActionPromptElement) {

        nightActionPromptElement.textContent = "点击“进入夜晚”开始夜间流程。";

    }

});

// --- 自定义角色UI逻辑 ---

function handleAddCustomRole() {

    const roleIdInput = document.getElementById('roleIdInput');

    const roleNameInput = document.getElementById('roleNameInput');

    const roleFactionSelect = document.getElementById('roleFactionSelect');

    const roleWordSourceSelect = document.getElementById('roleWordSourceSelect');

    const roleHasNightActionCheckbox = document.getElementById('roleHasNightActionCheckbox');

    const roleNightActionPromptTextarea = document.getElementById('roleNightActionPromptTextarea');

    const roleId = roleIdInput.value.trim().toUpperCase().replace(/\s+/g, '_');

    const roleName = roleNameInput.value.trim();

    

    if (!roleId || !roleName) { alert("角色ID和角色名称不能为空！"); return; }

    if (userDefinedRoles[roleId] && !confirm(`角色ID "${roleId}" 已存在，要覆盖更新吗？`)) return;

    userDefinedRoles[roleId] = {

        id: roleId, name: roleName, faction: roleFactionSelect.value,

        wordSource: roleWordSourceSelect.value, hasNightAction: roleHasNightActionCheckbox.checked,

        nightActionPrompt: roleNightActionPromptTextarea.value.trim()

    };

    saveDataToLocalStorage(LS_ROLES_KEY, userDefinedRoles);

    updateCustomRolesDisplay(); populateSetupRoleSelect();

    roleIdInput.value = ""; roleNameInput.value = ""; roleNightActionPromptTextarea.value = "";

    roleHasNightActionCheckbox.checked = false;

    alert(`角色 "${roleName}" (ID: ${roleId}) 已添加/更新！`);

}

function updateCustomRolesDisplay() {

    const listElement = document.getElementById('uiDefinedRolesList');

    if (!listElement) return;

    listElement.innerHTML = ""; 

    const roles = Object.values(userDefinedRoles);

    if (roles.length === 0) { listElement.innerHTML = "<li><em>尚无自定义角色</em></li>"; return; }

    roles.forEach(role => {

        const li = document.createElement('li');

        li.innerHTML = `<strong>${role.name}</strong> (ID: <code>${role.id}</code>) - 阵营: ${role.faction}, 词语: ${role.wordSource}, 夜晚行动: ${role.hasNightAction ? '是' : '否'}`;

        const deleteBtn = document.createElement('button');

        deleteBtn.textContent = '删除';

        deleteBtn.style.marginLeft = '10px';

        deleteBtn.style.backgroundColor = '#dc3545'; // Red for delete

        deleteBtn.onclick = () => {

            if (confirm(`确定要删除角色 "${role.name}" (ID: ${role.id}) 吗？`)) {

                delete userDefinedRoles[role.id];

                saveDataToLocalStorage(LS_ROLES_KEY, userDefinedRoles);

                updateCustomRolesDisplay();

                populateSetupRoleSelect(); // 角色列表变了，板子处可选角色也要更新

            }

        };

        li.appendChild(deleteBtn);

        listElement.appendChild(li);

    });

}

// --- 自定义板子UI逻辑 ---

function populateSetupRoleSelect() {

    const selectElement = document.getElementById('setupRoleSelect');

    if (!selectElement) return;

    const currentVal = selectElement.value; // 保存当前选中的值

    selectElement.innerHTML = '<option value="">--选择一个角色--</option>';

    const allAvailableRoles = {...fallbackRolesConfig, ...userDefinedRoles };

    for (const roleId in allAvailableRoles) {

        const option = document.createElement('option');

        option.value = roleId; 

        option.textContent = allAvailableRoles[roleId].name;

        selectElement.appendChild(option);

    }

    if (allAvailableRoles[currentVal]) selectElement.value = currentVal; // 尝试恢复之前的选择

}

function handleAddRoleToCurrentSetup() {

    const roleSelect = document.getElementById('setupRoleSelect');

    const quantityInput = document.getElementById('setupRoleQuantityInput');

    const selectedRoleId = roleSelect.value;

    const quantity = parseInt(quantityInput.value);

    if (!selectedRoleId) { alert("请选择一个角色！"); return; }

    if (isNaN(quantity) || quantity < 1) { alert("请输入有效的角色数量！"); return; }

    currentSetupBeingDefined.roles[selectedRoleId] = (currentSetupBeingDefined.roles[selectedRoleId] || 0) + quantity;

    updateCurrentSetupRolesDisplay();

}

function updateCurrentSetupRolesDisplay() {

    const listElement = document.getElementById('uiSetupRolesList');

    const totalPlayersSpan = document.getElementById('currentSetupTotalPlayers');

    const setupPlayerCountInput = document.getElementById('setupPlayerCountInput'); // 板子适用人数输入框

    if (!listElement || !totalPlayersSpan || !setupPlayerCountInput) return;

    listElement.innerHTML = "";

    let currentTotal = 0;

    const allAvailableRoles = {...fallbackRolesConfig, ...userDefinedRoles };

    if (Object.keys(currentSetupBeingDefined.roles).length === 0) {

        listElement.innerHTML = "<li><em>尚未添加角色</em></li>";

    } else {

        for (const roleId in currentSetupBeingDefined.roles) {

            const count = currentSetupBeingDefined.roles[roleId];

            const roleName = allAvailableRoles[roleId] ? allAvailableRoles[roleId].name : `未知(${roleId})`;

            const li = document.createElement('li');

            li.className = 'role-in-setup';

            li.innerHTML = `<span>${roleName}: ${count}个</span>`;

            const removeBtn = document.createElement('button');

            removeBtn.textContent = '移除1个'; // 改为移除一个

            removeBtn.onclick = function() {

                if (currentSetupBeingDefined.roles[roleId] > 1) {

                    currentSetupBeingDefined.roles[roleId]--;

                } else {

                    delete currentSetupBeingDefined.roles[roleId];

                }

                updateCurrentSetupRolesDisplay();

            };

            li.appendChild(removeBtn);

            listElement.appendChild(li);

            currentTotal += count;

        }

    }

    totalPlayersSpan.textContent = currentTotal;

    setupPlayerCountInput.value = currentTotal > 0 ? currentTotal : ""; // 自动更新板子适用人数

}

function handleSaveCustomSetup() {

    const setupNameInput = document.getElementById('setupNameInput');

    const setupPlayerCountInput = document.getElementById('setupPlayerCountInput');

    const setupNightActionOrderInput = document.getElementById('setupNightActionOrderInput');

    const name = setupNameInput.value.trim();

    const playerCount = parseInt(setupPlayerCountInput.value);

    if (!name) { alert("板子名称不能为空！"); return; }

    if (isNaN(playerCount) || playerCount < 4) { alert("板子配置的角色总数至少为4人！"); return; }

    if (Object.keys(currentSetupBeingDefined.roles).length === 0) { alert("板子中至少需要配置一个角色！"); return; }

    let calculatedPlayerCount = 0; Object.values(currentSetupBeingDefined.roles).forEach(c => calculatedPlayerCount += c);

    if (calculatedPlayerCount !== playerCount) {

        alert(`板子角色总数(${calculatedPlayerCount})与板子适用人数(${playerCount})不符！已自动修正适用人数。`);

        setupPlayerCountInput.value = calculatedPlayerCount; // 强制同步

    }

    const nightOrderString = setupNightActionOrderInput.value.trim();

    const nightActionOrder = nightOrderString ? nightOrderString.split(',').map(s => s.trim()).filter(s => s) : [];

    const newSetup = { name, playerCount: calculatedPlayerCount, roles: { ...currentSetupBeingDefined.roles }, nightActionOrder };

    const existingSetupIndex = userDefinedSetups.findIndex(s => s.name === name);

    if (existingSetupIndex > -1) {

        if (confirm(`名为 "${name}" 的板子已存在，要覆盖更新吗？`)) userDefinedSetups[existingSetupIndex] = newSetup; else return;

    } else { userDefinedSetups.push(newSetup); }

    saveDataToLocalStorage(LS_SETUPS_KEY, userDefinedSetups);

    updateCustomSetupsDisplay(); populateGameSetupSelect();

    setupNameInput.value = ""; setupNightActionOrderInput.value = "";

    currentSetupBeingDefined = { name: "", playerCount: 0, roles: {}, nightActionOrder: [] };

    updateCurrentSetupRolesDisplay();

    alert(`板子 "${name}" 已保存！`);

}

function updateCustomSetupsDisplay() {

    const listElement = document.getElementById('uiDefinedSetupsList');

    if (!listElement) return;

    listElement.innerHTML = "";

    if (userDefinedSetups.length === 0) { listElement.innerHTML = "<li><em>尚无自定义板子</em></li>"; return; }

    userDefinedSetups.forEach(setup => {

        const li = document.createElement('li');

        let rolesText = []; const allAvailableRoles = {...fallbackRolesConfig, ...userDefinedRoles };

        for (const roleId in setup.roles) rolesText.push(`${allAvailableRoles[roleId]?allAvailableRoles[roleId].name:roleId}(${setup.roles[roleId]})`);

        li.innerHTML = `<strong>${setup.name}</strong> (${setup.playerCount}人) 

                        <br/>- 角色: ${rolesText.join(', ')}

                        <br/>- 夜晚顺序: ${setup.nightActionOrder.join(' -> ') || '默认/未指定'}`;

        const deleteBtn = document.createElement('button');

        deleteBtn.textContent = '删除板子';

        deleteBtn.style.marginLeft = '10px';

        deleteBtn.style.backgroundColor = '#dc3545';

        deleteBtn.onclick = () => {

            if (confirm(`确定要删除板子 "${setup.name}" 吗？`)) {

                userDefinedSetups = userDefinedSetups.filter(s => s.name !== setup.name);

                saveDataToLocalStorage(LS_SETUPS_KEY, userDefinedSetups);

                updateCustomSetupsDisplay();

                populateGameSetupSelect(); // 板子列表变了，开始游戏处的可选板子也要更新

            }

        };

        li.appendChild(deleteBtn);

        listElement.appendChild(li);

    });

}

function populateGameSetupSelect() {

    const selectElement = document.getElementById('selectGameSetup');

    const playerCountDisplay = document.getElementById('playerCountDisplay');

    if (!selectElement || !playerCountDisplay) return;

    const previouslySelected = selectElement.value;

    selectElement.innerHTML = '<option value="">--选择一个板子配置--</option>';

    userDefinedSetups.forEach(setup => {

        const option = document.createElement('option');

        option.value = setup.name; option.textContent = `${setup.name} (${setup.playerCount}人)`;

        selectElement.appendChild(option);

    });

    if (userDefinedSetups.find(s => s.name === previouslySelected)) {

        selectElement.value = previouslySelected;

        const selectedSetup = userDefinedSetups.find(s => s.name === previouslySelected);

        if (selectedSetup) playerCountDisplay.value = selectedSetup.playerCount;

    } else playerCountDisplay.value = "";

}

// --- 计票器函数 ---

function handleSubmitVote() {

    const votePlayerIdInput = document.getElementById('votePlayerIdInput');

    if (!votePlayerIdInput) return;

    const playerIdToVote = parseInt(votePlayerIdInput.value);

    if (isNaN(playerIdToVote)) { alert("请输入有效的玩家编号！"); return; }

    const targetPlayer = players.find(p => p.id === playerIdToVote);

    if (!targetPlayer) { alert(`玩家编号 ${playerIdToVote} 不存在！`); return; }

    if (targetPlayer.status === "已出局") { alert(`玩家 ${playerIdToVote} (${targetPlayer.role}) 已出局，不能投票！`); return; }

    targetPlayer.votes++;

    console.log(`玩家 ${playerIdToVote} (${targetPlayer.role}) 获得一票，当前票数: ${targetPlayer.votes}`);

    displayPlayers(); // 刷新显示，会包含票数

    votePlayerIdInput.value = ""; // 清空输入框

    votePlayerIdInput.focus(); // 方便连续输入

}

function handleResetVotes() {

    if (players.length === 0) { alert("尚未开始游戏或分配身份！"); return; }

    if (confirm("确定要重置所有玩家的当前票数吗？")) {

        players.forEach(p => p.votes = 0);

        displayPlayers(); // 刷新显示

        console.log("所有票数已重置。");

    }

}

// --- 游戏核心逻辑函数 ---

function setupGame(goodWord, wolfWord, selectedSetupObject) {

    console.log("进入 setupGame (UI配置版)");

    players = []; 

    gameWords.goodWord = goodWord; gameWords.wolfWord = wolfWord;

    const playerInfoArea = document.getElementById('playerInfoArea');

    if (!playerInfoArea) { console.error("错误：setupGame 找不到 playerInfoArea"); return; }

    playerInfoArea.innerHTML = ""; 

    const playerCount = selectedSetupObject.playerCount;

    const currentRolesDefinition = { ...fallbackRolesConfig, ...userDefinedRoles }; 

    let roleDeck = [];

    console.log(`使用板子 "${selectedSetupObject.name}" 为 ${playerCount} 人配置角色。`);

    for (const roleId in selectedSetupObject.roles) {

        const count = selectedSetupObject.roles[roleId];

        const roleDef = currentRolesDefinition[roleId];

        if (roleDef) {

            for (let i = 0; i < count; i++) roleDeck.push(roleDef);

        } else {

            playerInfoArea.innerHTML = `<p>错误：板子配置中的角色ID "${roleId}" 未定义！</p>`; return;

        }

    }

    if (roleDeck.length !== playerCount) {

        playerInfoArea.innerHTML = `<p>错误：板子 "${selectedSetupObject.name}" 配置的身份牌总数(${roleDeck.length})与板子声称的玩家人数(${playerCount})不符！</p>`; return;

    }

    roleDeck = shuffleArray(roleDeck);

    for (let i = 0; i < playerCount; i++) {

        const assignedRoleDef = roleDeck[i];

        let assignedWord = "无词语"; 

        if (assignedRoleDef.wordSource === "good") assignedWord = gameWords.goodWord;

        else if (assignedRoleDef.wordSource === "wolf") assignedWord = gameWords.wolfWord;

        

        players.push({

            id: i + 1, role: assignedRoleDef.name, word: assignedWord,

            faction: assignedRoleDef.faction, status: "游戏中", buffs: [], votes: 0, // 初始化票数

            nightActionDone: false, hasNightAction: !!assignedRoleDef.hasNightAction,

            nightActionPrompt: assignedRoleDef.nightActionPrompt || `请 ${assignedRoleDef.name} 行动。`

        });

    }

    console.log("分配完成的玩家列表:", players);

    displayPlayers(); // 初始显示，票数为0

    handleResetVotes(); // 确保开始新游戏时票数清零（虽然上面已经初始化为0，双重保险）

}

// --- 夜晚逻辑 ---

function compileNightActions() {

    activeNightActions = [];

    let orderToUse = [...fallbackNightActionOrderDefinition]; // 默认后备顺序, 创建副本以防修改

    const currentPlayedSetup = userDefinedSetups.find(s => s.playerCount === players.length && 

        s.name === document.getElementById('selectGameSetup')?.value // 用当前选中的板子名来确定是哪个板子

    );

    if (currentPlayedSetup && currentPlayedSetup.nightActionOrder && currentPlayedSetup.nightActionOrder.length > 0) {

        orderToUse = currentPlayedSetup.nightActionOrder;

    }

    console.log("夜晚行动顺序将使用:", orderToUse);

    orderToUse.forEach(roleName => {

        const alive = players.filter(p=>p.status==="游戏中" && p.role===roleName && p.hasNightAction);

        if (alive.length > 0) {

            let prompt = alive[0].nightActionPrompt; 

            if (roleName !== "狼人" && !prompt.includes("号玩家") && alive.length > 0 ) {

                prompt = `请 ${roleName} (${alive.map(p => p.id).join(', ')}号玩家) ${prompt.startsWith('请 ') ? prompt.substring(2) : prompt}`;

            }

            activeNightActions.push({ roleName, playersInvolved: alive, prompt });

        }

    });

}

// --- 显示玩家列表的函数 (添加票数显示) ---

function displayPlayers() {

    const playerInfoArea = document.getElementById('playerInfoArea');

    if (!playerInfoArea) { console.error("错误：displayPlayers 找不到 playerInfoArea"); return; }

    let html = "<h3>玩家状态及信息：</h3><ul>";

    if (players.length === 0) html += "<li>尚未配置玩家或选择板子。</li>";

    else {

        players.forEach(p => {

            html += `

                <li style="margin-bottom: 15px; padding: 10px; border: 1px solid ${p.status === '已出局' ? '#e74c3c' : '#ccc'}; background-color: ${p.status === '已出局' ? '#fadbd8' : (p.votes > 0 ? '#e8f8f5' : 'white')}; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">

                    <strong>玩家 ${p.id}:</strong> ${p.role} (${p.faction})

                    <br>－ 词语: "${p.word}" 

                    <br>－ 状态: <span style="font-weight: bold; color: ${p.status === '已出局' ? '#c0392b' : '#27ae60'};">${p.status}</span>

                    <br>－ 备注/Buffs: ${p.buffs.length > 0 ? p.buffs.join('; ') : '无'}

                    <br>－ 当前票数: <strong style="color: #007bff;">${p.votes}</strong>

                    <div style="margin-top: 8px;" class="button-group">

                        <button onclick="togglePlayerStatus(${p.id})">${p.status === '游戏中' ? '标记为出局' : '恢复游戏'}</button>

                        <button onclick="addBuffToPlayer(${p.id})">添加备注</button>

                    </div>

                </li>`;

        });

    }

    html += "</ul>";

    playerInfoArea.innerHTML = html;

}

// --- 其他核心函数 (togglePlayerStatus, addBuffToPlayer, Timer, Phase, Shuffle - 基本不变) ---

function togglePlayerStatus(playerId) { /* ... 与之前版本相同 ... */ 

    const p = players.find(pl => pl.id === playerId);

    if (p) { p.status = (p.status === "游戏中") ? "已出局" : "游戏中"; displayPlayers(); }

    else { console.error(`错误：togglePlayerStatus 找不到 ID 为 ${playerId} 的玩家`); }

}

function addBuffToPlayer(playerId) { /* ... 与之前版本相同 ... */ 

    const p = players.find(pl => pl.id === playerId);

    if (p) {

        const buff = prompt(`给玩家 ${p.id} (${p.role}) 添加备注：`, p.buffs.length > 0 ? p.buffs[p.buffs.length-1] : "例如：被守护");

        if (buff !== null && buff.trim() !== "") { p.buffs.push(buff.trim()); displayPlayers(); }

        else if (buff !== null) alert("备注内容不能为空！");

    } else { console.error(`错误：addBuffToPlayer 找不到 ID 为 ${playerId} 的玩家`); }

}

function formatTime(s) { const m=Math.floor(s/60); s%=60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function updateTimerDisplay() { const el=document.getElementById('timerDisplay'); if(el) el.textContent=formatTime(currentRemainingSeconds); }

function initializeTimer() {

    stopTimer();

    const inputEl = document.getElementById('speechDuration');

    if (inputEl) {

        const val = parseInt(inputEl.value);

        if (!isNaN(val) && val >= 10) totalSpeechTimeInSeconds = val; else inputEl.value = String(totalSpeechTimeInSeconds);

    }

    currentRemainingSeconds = totalSpeechTimeInSeconds;

    updateTimerDisplay();

}

function startTimer() {

    if (timerInterval !== null) stopTimer();

    const inputEl = document.getElementById('speechDuration');

    if (inputEl) { const val = parseInt(inputEl.value); if (!isNaN(val) && val >= 10) totalSpeechTimeInSeconds = val;}

    if(currentRemainingSeconds <= 0 || currentRemainingSeconds > totalSpeechTimeInSeconds) { // 如果时间不合理，或已结束，则重置

      currentRemainingSeconds = totalSpeechTimeInSeconds;

    }

    updateTimerDisplay();

    timerInterval = setInterval(() => {

        currentRemainingSeconds--; updateTimerDisplay();

        if (currentRemainingSeconds < 0) { // 改为 <0 确保00:00能显示

            currentRemainingSeconds = 0; // 修正为0

            stopTimer(); const el=document.getElementById('timerDisplay'); if(el) el.textContent="时间到!";

        }

    }, 1000);

}

function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

function resetTimer() {

    stopTimer();

    const inputEl = document.getElementById('speechDuration');

    if (inputEl) { const val = parseInt(inputEl.value); if (!isNaN(val) && val >= 10) totalSpeechTimeInSeconds = val; }

    currentRemainingSeconds = totalSpeechTimeInSeconds;

    updateTimerDisplay();

}

function updatePhaseDisplay() { /* ... 与之前版本相同 ... */ 

    const phaseEl = document.getElementById('currentPhaseDisplay');

    const nightBtn = document.getElementById('enterNightButton');

    const nextBtn = document.getElementById('nextNightActionButton');

    const dayBtn = document.getElementById('enterDayButton');

    if (phaseEl) phaseEl.textContent = `当前阶段: ${currentPhase}`;

    if (currentPhase === "白天") {

        if (nightBtn) nightBtn.style.display = 'inline-block';

        if (nextBtn) nextBtn.style.display = 'none';

        if (dayBtn) dayBtn.style.display = 'none';

    } else { 

        if (nightBtn) nightBtn.style.display = 'none';

    }

}

function displayCurrentNightActionPrompt() { /* ... 与之前版本相同 ... */ 

    const promptEl = document.getElementById('nightActionPrompt');

    const nextBtn = document.getElementById('nextNightActionButton');

    const dayBtn = document.getElementById('enterDayButton');

    if (!promptEl || !nextBtn || !dayBtn) { console.error("显示夜晚提示时，HTML元素缺失！"); return; }

    if (currentNightActionIndex < activeNightActions.length) {

        const action = activeNightActions[currentNightActionIndex];

        promptEl.innerHTML = `<strong>${action.roleName} 行动：</strong><br>${action.prompt}`;

        nextBtn.style.display = 'inline-block'; dayBtn.style.display = 'none';

    } else {

        promptEl.textContent = "所有夜间行动已结束。请点击“进入白天”。";

        nextBtn.style.display = 'none'; dayBtn.style.display = 'inline-block';

    }

}

function enterNightPhase() { /* ... 与之前版本相同 ... */ 

    if (players.length === 0) { alert("请先选择板子并生成身份！"); return; }

    currentPhase = "夜晚"; console.log("进入夜晚");

    compileNightActions(); currentNightActionIndex = 0;

    updatePhaseDisplay(); displayCurrentNightActionPrompt();

}

function advanceNightAction() { currentNightActionIndex++; displayCurrentNightActionPrompt(); }

function enterDayPhase() { /* ... 与之前版本相同 ... */ 

    currentPhase = "白天"; console.log("进入白天");

    updatePhaseDisplay(); 

    const el = document.getElementById('nightActionPrompt');

    if (el) el.innerHTML = "天亮了！<br>请主持人根据夜晚记录，宣布昨夜发生的事情。";

}

function shuffleArray(array) { /* ... 与之前版本相同 ... */ 

    let ci = array.length, ri;

    while (ci !== 0) { ri = Math.floor(Math.random() * ci); ci--; [array[ci], array[ri]] = [array[ri], array[ci]];}

    return array;

}